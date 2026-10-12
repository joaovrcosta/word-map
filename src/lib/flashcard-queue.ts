import type { FlashcardWord } from "@/actions/flashcards";

export type RecallStep = {
  type: "recall";
  word: FlashcardWord;
};

export type ListenStep = {
  type: "listen";
  word: FlashcardWord;
  options: string[];
};

export type MatchPair = {
  word: FlashcardWord;
  translation: string;
};

export type MatchStep = {
  type: "match";
  pairs: MatchPair[];
};

export type FlashcardStep = RecallStep | ListenStep | MatchStep;

function primaryTranslation(word: FlashcardWord) {
  const value = word.translations.find((item) => item.trim());
  return value?.trim() ?? null;
}

function shuffle<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }
  return copy;
}

function uniqueTranslations(words: FlashcardWord[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const word of words) {
    const translation = primaryTranslation(word);
    if (!translation) continue;
    const key = translation.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(translation);
  }

  return unique;
}

function listenOptions(
  word: FlashcardWord,
  words: FlashcardWord[],
  random: () => number
) {
  const correct = primaryTranslation(word);
  if (!correct) return [];

  const distractors = shuffle(
    uniqueTranslations(words).filter(
      (translation) => translation.toLowerCase() !== correct.toLowerCase()
    ),
    random
  ).slice(0, 3);

  return shuffle([correct, ...distractors], random);
}

export function buildFlashcardQueue(
  words: FlashcardWord[],
  random: () => number = Math.random
): FlashcardStep[] {
  const canListen = uniqueTranslations(words).length >= 2;
  const recall: FlashcardWord[] = [];
  const challenge: FlashcardWord[] = [];

  for (const word of words) {
    const translation = primaryTranslation(word);
    if (word.confidence <= 1 || !translation || !canListen) {
      recall.push(word);
      continue;
    }
    challenge.push(word);
  }

  const pool = shuffle(challenge, random);
  const matchWords: FlashcardWord[] = [];
  const usedTranslations = new Set<string>();

  if (pool.length >= 4) {
    for (const word of pool) {
      const translation = primaryTranslation(word);
      if (!translation) continue;
      const key = translation.toLowerCase();
      if (usedTranslations.has(key)) continue;
      usedTranslations.add(key);
      matchWords.push(word);
      if (matchWords.length === 4) break;
    }
  }

  const matchIds = new Set(matchWords.map((word) => word.id));
  const steps: FlashcardStep[] = recall.map((word) => ({
    type: "recall",
    word,
  }));

  if (matchWords.length === 4) {
    steps.push({
      type: "match",
      pairs: matchWords.map((word) => ({
        word,
        translation: primaryTranslation(word) ?? "",
      })),
    });
  }

  for (const word of pool) {
    if (matchIds.has(word.id) && matchWords.length === 4) continue;
    const options = listenOptions(word, words, random);
    if (options.length < 2) {
      steps.push({ type: "recall", word });
      continue;
    }
    steps.push({ type: "listen", word, options });
  }

  return shuffle(steps, random);
}
