const DAY_MS = 24 * 60 * 60 * 1000;

export function isWordDue(
  word: { confidence: number; lastPractice?: Date | string | null },
  now = Date.now()
) {
  if (word.confidence <= 1 || !word.lastPractice) return true;
  const elapsed = now - new Date(word.lastPractice).getTime();
  const days = word.confidence >= 4 ? 7 : word.confidence === 3 ? 3 : 1;
  return elapsed > days * DAY_MS;
}
