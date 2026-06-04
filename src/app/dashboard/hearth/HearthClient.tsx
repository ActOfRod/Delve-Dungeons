"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  getPuzzleAttempt,
  getRiddleAttempt,
  guessesRemaining,
  hearthDayKey,
  isAttemptClosed,
  nextRiddleStreak,
  parseHearthState,
  puzzleForDay,
  riddleForDay,
  riddleRewardGp,
  PUZZLE_REWARD_GP,
  HEARTH_MAX_GUESSES,
  RIDDLE_BASE_GP,
  RIDDLE_STREAK_BONUS_GP,
} from "@/lib/hearth";
import type { Character } from "@/lib/types";
import { submitHearthPuzzleChoice, submitHearthRiddleGuess } from "./actions";

export function HearthClient({
  characters,
  hearthState: rawState,
}: {
  characters: Character[];
  hearthState?: unknown;
}) {
  const router = useRouter();
  const dayKey = hearthDayKey();
  const state = useMemo(() => parseHearthState(rawState), [rawState]);
  const riddle = useMemo(() => riddleForDay(dayKey), [dayKey]);
  const puzzle = useMemo(() => puzzleForDay(dayKey), [dayKey]);
  const riddleAttempt = useMemo(
    () => getRiddleAttempt(state, dayKey),
    [state, dayKey],
  );
  const puzzleAttempt = useMemo(
    () => getPuzzleAttempt(state, dayKey),
    [dayKey, state],
  );

  const [characterId, setCharacterId] = useState(characters[0]?.id ?? "");
  const [riddleGuess, setRiddleGuess] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const projectedStreak = nextRiddleStreak(state, dayKey);
  const projectedRiddleGp = riddleRewardGp(projectedStreak);

  function submitRiddle() {
    if (!characterId) {
      setError("Choose a hero to receive gold.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await submitHearthRiddleGuess(characterId, riddleGuess);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.solved) {
        setMessage(
          `Correct! ${result.rewardGp} GP sent to your hero (streak ${result.streak}).`,
        );
        setRiddleGuess("");
      } else if (result.forfeited) {
        setMessage(
          "Three misses — no gold today. The streak resets; try again tomorrow.",
        );
      } else {
        setMessage(
          `Not quite. ${result.guessesLeft} guess${result.guessesLeft === 1 ? "" : "es"} left.`,
        );
        setRiddleGuess("");
      }
      router.refresh();
    });
  }

  function submitPuzzle(optionIndex: number) {
    if (!characterId) {
      setError("Choose a hero to receive gold.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await submitHearthPuzzleChoice(characterId, optionIndex);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.solved) {
        setMessage(`Right! ${result.rewardGp} GP added to your hero.`);
      } else if (result.forfeited) {
        setMessage("Three misses — puzzle reward forfeited for today.");
      } else {
        setMessage(
          `Wrong. ${result.guessesLeft} try${result.guessesLeft === 1 ? "" : "es"} left.`,
        );
      }
      router.refresh();
    });
  }

  if (characters.length === 0) {
    return (
      <p className="text-sm text-parchment/50">
        Create a hero first — The Hearth pays adventurers, not strangers.
      </p>
    );
  }

  const riddleClosed = isAttemptClosed(riddleAttempt);
  const puzzleClosed = isAttemptClosed(puzzleAttempt);

  return (
    <div className="space-y-8">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-parchment/55">
          Pay rewards to
        </span>
        <select
          value={characterId}
          onChange={(e) => setCharacterId(e.target.value)}
          className="w-full rounded-xl border border-ember/25 bg-black/30 px-3 py-2.5 text-parchment outline-none focus:border-ember focus:ring-2 focus:ring-ember/30"
        >
          {characters.map((c) => (
            <option key={c.id} value={c.id} className="bg-ink">
              {c.name} — Lv {c.level} {c.klass}
            </option>
          ))}
        </select>
      </label>

      {(error || message) && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            error
              ? "border-ember/40 bg-ember/10 text-ember-bright"
              : "border-moss/30 bg-moss/10 text-green-200"
          }`}
          role="status"
        >
          {error ?? message}
        </p>
      )}

      <section className="space-y-4">
        <header>
          <h2 className="font-display text-xl text-parchment">Daily Riddle</h2>
          <p className="mt-1 text-xs text-parchment/50">
            Base {RIDDLE_BASE_GP} GP, +{RIDDLE_STREAK_BONUS_GP} GP per day in a
            row (max +14). Three guesses — then the coffer stays shut until
            tomorrow.
          </p>
          {!riddleAttempt.solved && !riddleAttempt.forfeited && (
            <p className="mt-2 text-sm text-gold">
              Streak if you solve today: {projectedStreak} → {projectedRiddleGp}{" "}
              GP
              {state.riddleStreak > 0 && state.lastRiddleSolvedDay !== dayKey && (
                <span className="text-parchment/45">
                  {" "}
                  (current best streak: {state.riddleStreak})
                </span>
              )}
            </p>
          )}
        </header>

        <div className="rounded-xl border border-white/8 bg-black/25 p-4">
          <p className="font-display text-lg leading-snug text-parchment">
            {riddle.prompt}
          </p>
          {riddle.hint && !riddleClosed && (
            <p className="mt-2 text-xs italic text-parchment/45">
              Hint: {riddle.hint}
            </p>
          )}

          {riddleAttempt.solved ? (
            <p className="mt-4 text-sm text-moss">
              Solved for {riddleAttempt.rewardGp} GP today. Streak:{" "}
              {state.riddleStreak}.
            </p>
          ) : riddleAttempt.forfeited ? (
            <p className="mt-4 text-sm text-parchment/50">
              Forfeited today ({HEARTH_MAX_GUESSES} guesses used). Come back after
              midnight UTC.
            </p>
          ) : (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={riddleGuess}
                onChange={(e) => setRiddleGuess(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitRiddle();
                }}
                placeholder="Your answer…"
                disabled={isPending}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-parchment outline-none focus:border-ember disabled:opacity-50"
              />
              <button
                type="button"
                onClick={submitRiddle}
                disabled={isPending || !riddleGuess.trim()}
                className="rounded-lg bg-gradient-to-r from-ember to-ember-bright px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
              >
                {isPending
                  ? "Checking…"
                  : `Submit (${guessesRemaining(riddleAttempt)} left)`}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="font-display text-xl text-parchment">Daily Puzzle</h2>
          <p className="mt-1 text-xs text-parchment/50">
            {PUZZLE_REWARD_GP} GP for a correct choice. Three tries, then wait
            until tomorrow.
          </p>
        </header>

        <div className="rounded-xl border border-white/8 bg-black/25 p-4">
          <p className="text-sm leading-relaxed text-parchment">{puzzle.prompt}</p>

          {puzzleAttempt.solved ? (
            <p className="mt-4 text-sm text-moss">
              Cleared for {puzzleAttempt.rewardGp} GP today.
            </p>
          ) : puzzleAttempt.forfeited ? (
            <p className="mt-4 text-sm text-parchment/50">
              Forfeited today. New puzzle at the next hearth fire (UTC midnight).
            </p>
          ) : (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {puzzle.options.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => submitPuzzle(i)}
                  disabled={isPending}
                  className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-left text-sm text-parchment transition hover:border-ember/40 hover:bg-ember/10 disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {!puzzleClosed && (
            <p className="mt-3 text-[10px] text-parchment/40">
              {guessesRemaining(puzzleAttempt)} attempt
              {guessesRemaining(puzzleAttempt) === 1 ? "" : "s"} remaining
            </p>
          )}
        </div>
      </section>

      <ComingSoonSection title="Daily Challenges" />
      <ComingSoonSection title="Weekly Challenges" />
    </div>
  );
}

function ComingSoonSection({ title }: { title: string }) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-dashed border-white/10 bg-black/15 p-6">
      <h2 className="font-display text-lg text-parchment/40">{title}</h2>
      <p className="mt-1 text-xs text-parchment/30">
        Table tales, hunts, and deeds — checked against your campaigns.
      </p>
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/60 backdrop-blur-[1px]"
        aria-hidden
      >
        <span className="rounded-full border border-white/15 bg-black/50 px-4 py-2 font-display text-sm text-parchment/70">
          Coming soon
        </span>
      </div>
    </section>
  );
}
