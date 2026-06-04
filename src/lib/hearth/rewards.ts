export const RIDDLE_BASE_GP = 10;
export const RIDDLE_STREAK_BONUS_GP = 2;
export const RIDDLE_MAX_STREAK_BONUS_GP = 14;

export const PUZZLE_REWARD_GP = 10;

export const HEARTH_MAX_GUESSES = 3;

/** GP for a correct daily riddle at the given streak (1 = first day in a row). */
export function riddleRewardGp(streak: number): number {
  const s = Math.max(1, Math.floor(streak));
  const bonus = Math.min((s - 1) * RIDDLE_STREAK_BONUS_GP, RIDDLE_MAX_STREAK_BONUS_GP);
  return RIDDLE_BASE_GP + bonus;
}
