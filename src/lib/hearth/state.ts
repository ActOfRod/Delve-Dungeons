import { hearthDayKey, previousHearthDayKey } from "./day-key";
import { HEARTH_MAX_GUESSES } from "./rewards";

export interface HearthDayAttempt {
  dayKey: string;
  wrongGuesses: number;
  solved: boolean;
  forfeited: boolean;
  rewardGp?: number;
  characterId?: string;
}

export interface HearthState {
  riddleStreak: number;
  lastRiddleSolvedDay?: string;
  riddle?: HearthDayAttempt;
  puzzle?: HearthDayAttempt;
}

export function parseHearthState(raw: unknown): HearthState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { riddleStreak: 0 };
  }
  const o = raw as Record<string, unknown>;
  const parseDay = (v: unknown): HearthDayAttempt | undefined => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return undefined;
    const d = v as Record<string, unknown>;
    if (typeof d.dayKey !== "string") return undefined;
    return {
      dayKey: d.dayKey,
      wrongGuesses: Math.min(
        HEARTH_MAX_GUESSES,
        Math.max(0, Number(d.wrongGuesses) || 0),
      ),
      solved: Boolean(d.solved),
      forfeited: Boolean(d.forfeited),
      rewardGp: typeof d.rewardGp === "number" ? d.rewardGp : undefined,
      characterId:
        typeof d.characterId === "string" ? d.characterId : undefined,
    };
  };
  return {
    riddleStreak: Math.max(0, Number(o.riddleStreak) || 0),
    lastRiddleSolvedDay:
      typeof o.lastRiddleSolvedDay === "string"
        ? o.lastRiddleSolvedDay
        : undefined,
    riddle: parseDay(o.riddle),
    puzzle: parseDay(o.puzzle),
  };
}

function freshDayAttempt(dayKey: string): HearthDayAttempt {
  return {
    dayKey,
    wrongGuesses: 0,
    solved: false,
    forfeited: false,
  };
}

export function getRiddleAttempt(
  state: HearthState,
  dayKey = hearthDayKey(),
): HearthDayAttempt {
  if (state.riddle?.dayKey === dayKey) return state.riddle;
  return freshDayAttempt(dayKey);
}

export function getPuzzleAttempt(
  state: HearthState,
  dayKey = hearthDayKey(),
): HearthDayAttempt {
  if (state.puzzle?.dayKey === dayKey) return state.puzzle;
  return freshDayAttempt(dayKey);
}

export function guessesRemaining(attempt: HearthDayAttempt): number {
  return Math.max(0, HEARTH_MAX_GUESSES - attempt.wrongGuesses);
}

export function isAttemptClosed(attempt: HearthDayAttempt): boolean {
  return attempt.solved || attempt.forfeited;
}

/** Streak after a correct solve today. */
export function nextRiddleStreak(
  state: HearthState,
  dayKey: string,
): number {
  const yesterday = previousHearthDayKey(dayKey);
  if (state.lastRiddleSolvedDay === yesterday) {
    return state.riddleStreak + 1;
  }
  return 1;
}
