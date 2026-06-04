"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hearthDayKey } from "@/lib/hearth/day-key";
import { answerMatches } from "@/lib/hearth/answers";
import { puzzleForDay } from "@/lib/hearth/puzzles";
import {
  HEARTH_MAX_GUESSES,
  PUZZLE_REWARD_GP,
  riddleRewardGp,
} from "@/lib/hearth/rewards";
import { riddleForDay } from "@/lib/hearth/riddles";
import {
  getPuzzleAttempt,
  getRiddleAttempt,
  guessesRemaining,
  isAttemptClosed,
  nextRiddleStreak,
  parseHearthState,
  type HearthState,
} from "@/lib/hearth/state";
import { mergeInventoryGrants } from "@/lib/inventory";
import { createClient } from "@/lib/supabase/server";
import type { InventoryItem } from "@/lib/types";

export type HearthGuessResult = {
  error?: string;
  correct?: boolean;
  solved?: boolean;
  forfeited?: boolean;
  guessesLeft?: number;
  rewardGp?: number;
  streak?: number;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function grantGoldToCharacter(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  characterId: string,
  goldGp: number,
): Promise<{ error?: string }> {
  const { data: character, error } = await supabase
    .from("characters")
    .select("id, klass, inventory")
    .eq("id", characterId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!character) return { error: "Character not found." };

  const inventory = mergeInventoryGrants(
    (character.inventory ?? []) as InventoryItem[],
    [{ name: "Gold pieces", quantity: goldGp, description: "The Hearth" }],
    { klass: character.klass as string },
  );

  const { error: updateErr } = await supabase
    .from("characters")
    .update({ inventory })
    .eq("id", characterId)
    .eq("user_id", userId);

  if (updateErr) return { error: updateErr.message };
  return {};
}

async function saveHearthState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  state: HearthState,
) {
  return supabase.from("profiles").update({ hearth_state: state }).eq("id", userId);
}

export async function submitHearthRiddleGuess(
  characterId: string,
  guess: string,
): Promise<HearthGuessResult> {
  const { supabase, user } = await requireUser();
  const dayKey = hearthDayKey();
  const riddle = riddleForDay(dayKey);

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("hearth_state")
    .eq("id", user.id)
    .single();

  if (profileErr) return { error: profileErr.message };

  let state = parseHearthState(profile?.hearth_state);
  let attempt = getRiddleAttempt(state, dayKey);

  if (isAttemptClosed(attempt)) {
    return {
      solved: attempt.solved,
      forfeited: attempt.forfeited,
      guessesLeft: 0,
      rewardGp: attempt.rewardGp,
      streak: state.riddleStreak,
    };
  }

  const trimmed = guess.trim();
  if (!trimmed) return { error: "Enter an answer." };

  if (answerMatches(trimmed, riddle.answers)) {
    const streak = nextRiddleStreak(state, dayKey);
    const rewardGp = riddleRewardGp(streak);
    const grant = await grantGoldToCharacter(
      supabase,
      user.id,
      characterId,
      rewardGp,
    );
    if (grant.error) return { error: grant.error };

    attempt = {
      ...attempt,
      solved: true,
      forfeited: false,
      rewardGp,
      characterId,
    };
    state = {
      ...state,
      riddleStreak: streak,
      lastRiddleSolvedDay: dayKey,
      riddle: attempt,
    };
    await saveHearthState(supabase, user.id, state);
    revalidatePath("/dashboard/hearth");
    revalidatePath("/dashboard");

    return {
      correct: true,
      solved: true,
      guessesLeft: guessesRemaining(attempt),
      rewardGp,
      streak,
    };
  }

  const wrongGuesses = attempt.wrongGuesses + 1;
  const forfeited = wrongGuesses >= HEARTH_MAX_GUESSES;
  attempt = {
    ...attempt,
    wrongGuesses,
    forfeited,
    solved: false,
  };
  if (forfeited) {
    state = { ...state, riddleStreak: 0, riddle: attempt };
  } else {
    state = { ...state, riddle: attempt };
  }
  await saveHearthState(supabase, user.id, state);
  revalidatePath("/dashboard/hearth");

  return {
    correct: false,
    forfeited,
    guessesLeft: guessesRemaining(attempt),
    streak: state.riddleStreak,
  };
}

export async function submitHearthPuzzleChoice(
  characterId: string,
  optionIndex: number,
): Promise<HearthGuessResult> {
  const { supabase, user } = await requireUser();
  const dayKey = hearthDayKey();
  const puzzle = puzzleForDay(dayKey);

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("hearth_state")
    .eq("id", user.id)
    .single();

  if (profileErr) return { error: profileErr.message };

  let state = parseHearthState(profile?.hearth_state);
  let attempt = getPuzzleAttempt(state, dayKey);

  if (isAttemptClosed(attempt)) {
    return {
      solved: attempt.solved,
      forfeited: attempt.forfeited,
      guessesLeft: 0,
      rewardGp: attempt.rewardGp,
    };
  }

  if (
    !Number.isInteger(optionIndex) ||
    optionIndex < 0 ||
    optionIndex >= puzzle.options.length
  ) {
    return { error: "Pick one of the answers." };
  }

  if (optionIndex === puzzle.correctIndex) {
    const rewardGp = PUZZLE_REWARD_GP;
    const grant = await grantGoldToCharacter(
      supabase,
      user.id,
      characterId,
      rewardGp,
    );
    if (grant.error) return { error: grant.error };

    attempt = {
      ...attempt,
      solved: true,
      forfeited: false,
      rewardGp,
      characterId,
    };
    state = { ...state, puzzle: attempt };
    await saveHearthState(supabase, user.id, state);
    revalidatePath("/dashboard/hearth");
    revalidatePath("/dashboard");

    return {
      correct: true,
      solved: true,
      guessesLeft: guessesRemaining(attempt),
      rewardGp,
    };
  }

  const wrongGuesses = attempt.wrongGuesses + 1;
  const forfeited = wrongGuesses >= HEARTH_MAX_GUESSES;
  attempt = {
    ...attempt,
    wrongGuesses,
    forfeited,
    solved: false,
  };
  state = { ...state, puzzle: attempt };
  await saveHearthState(supabase, user.id, state);
  revalidatePath("/dashboard/hearth");

  return {
    correct: false,
    forfeited,
    guessesLeft: guessesRemaining(attempt),
  };
}
