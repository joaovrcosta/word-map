export const CHALLENGE_XP_BASE = 10;
export const CHALLENGE_XP_STEP = 5;
export const CHALLENGE_XP_MAX = 40;

/** XP for a correct answer given the streak count including this hit (1 = first correct). */
export function challengeXpForStreak(streak: number) {
  const n = Math.max(0, Math.floor(streak));
  if (n <= 0) return 0;
  return Math.min(CHALLENGE_XP_BASE + (n - 1) * CHALLENGE_XP_STEP, CHALLENGE_XP_MAX);
}
