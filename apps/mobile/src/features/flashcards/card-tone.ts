import type { FlashcardWord } from "@word-map/shared";

/** Soft vertical gradients — rose/purple/blue tones like the reference card. */
const CARD_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ["#C4788A", "#3A1F4A"],
  ["#9B6BA8", "#2A1A4A"],
  ["#7A6BB0", "#1E2548"],
  ["#6A8AB8", "#1A2A45"],
  ["#B87A9A", "#3A1840"],
  ["#8B6A9E", "#251838"],
  ["#A87888", "#2E1838"],
  ["#7888B8", "#1A2240"],
];

export function cardGradientForWord(wordId: number): readonly [string, string] {
  const index = Math.abs(Math.imul(wordId | 0, 0x45d9f3b) >>> 0) % CARD_GRADIENTS.length;
  return CARD_GRADIENTS[index] ?? CARD_GRADIENTS[0];
}

function primaryTranslation(word: FlashcardWord) {
  return word.translations.find((item) => item.trim())?.trim() ?? null;
}

function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = copy[index]!;
    copy[index] = copy[swapIndex]!;
    copy[swapIndex] = current;
  }
  return copy;
}

/**
 * Correct = primary translation of `word`; up to 3 distractors from the pool.
 * Returns [] if fewer than 2 options can be built (hide quiz).
 */
export function closestTranslationOptions(
  word: FlashcardWord,
  pool: ReadonlyArray<FlashcardWord>,
  random: () => number = Math.random
): string[] {
  const correct = primaryTranslation(word);
  if (!correct) return [];

  const seen = new Set<string>([correct.toLowerCase()]);
  const distractors: string[] = [];
  for (const candidate of shuffle([...pool], random)) {
    if (candidate.id === word.id) continue;
    const translation = primaryTranslation(candidate);
    if (!translation) continue;
    const key = translation.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(translation);
    if (distractors.length >= 3) break;
  }

  if (distractors.length === 0) return [];
  return shuffle([correct, ...distractors], random);
}
