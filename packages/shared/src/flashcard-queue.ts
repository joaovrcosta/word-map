import { isSingleWordName } from "./cloze-text";
import { daysUntilDue, isWordDue, latenessDays } from "./flashcard-schedule";

export type FlashcardWord = {
  id: number;
  name: string;
  grammaticalClass: string;
  category: string | null;
  translations: string[];
  confidence: number;
  lastPractice?: Date | null;
  missedLast?: boolean;
  vaultId: number;
  createdAt: Date;
  updatedAt: Date;
};

export type RecallStep = {
  type: "recall";
  word: FlashcardWord;
  retry?: boolean;
};

export type ListenStep = {
  type: "listen";
  word: FlashcardWord;
  options: string[];
  retry?: boolean;
};

export type MatchPair = {
  word: FlashcardWord;
  translation: string;
};

export type MatchStep = {
  type: "match";
  pairs: MatchPair[];
  retry?: boolean;
};

export type ClozeStep = {
  type: "cloze";
  word: FlashcardWord;
  sentence: string;
  answer: string;
  retry?: boolean;
};

export type ClozeSource = {
  wordId: number;
  sentence: string;
  answer: string;
};

export type FlashcardStep = RecallStep | ListenStep | MatchStep | ClozeStep;

export function stepWordIds(step: FlashcardStep): number[] {
  if (step.type === "match") return step.pairs.map((pair) => pair.word.id);
  return [step.word.id];
}

function sharesWord(left: FlashcardStep, right: FlashcardStep): boolean {
  const ids = new Set(stepWordIds(left));
  return stepWordIds(right).some((id) => ids.has(id));
}

export function insertSpacedClozes(
  steps: FlashcardStep[],
  clozes: ClozeStep[]
): FlashcardStep[] {
  const placed = [...steps];
  for (const cloze of clozes) {
    let slot = placed.length;
    for (let index = 0; index <= placed.length; index += 1) {
      const before = placed[index - 1];
      const after = placed[index];
      const touchesBefore = before ? sharesWord(before, cloze) : false;
      const touchesAfter = after ? sharesWord(after, cloze) : false;
      if (!touchesBefore && !touchesAfter) {
        slot = index;
        break;
      }
    }
    placed.splice(slot, 0, cloze);
  }
  return placed;
}

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

export const SESSION_CARDS = 10;
export const NEW_WORD_LIMIT = 3;

function clampLevel(confidence: number) {
  return Math.min(4, Math.max(1, Math.round(confidence)));
}

export function sessionScore(word: FlashcardWord, now: Date | number = Date.now()) {
  return (5 - clampLevel(word.confidence)) * 10 + (word.missedLast ? 30 : 0) + latenessDays(word, now);
}

export function selectPracticeWords<T extends FlashcardWord>(
  words: T[],
  now: Date | number = Date.now(),
  practiceAnyway = false
): T[] {
  const due = words.filter((word) => isWordDue(word, now));
  if (due.length === 0) {
    if (!practiceAnyway) return [];
    return [...words]
      .filter((word) => word.lastPractice)
      .sort(
        (left, right) =>
          daysUntilDue(left, now) - daysUntilDue(right, now) || left.id - right.id
      )
      .slice(0, SESSION_CARDS);
  }

  const ranked = [...due].sort(
    (left, right) => sessionScore(right, now) - sessionScore(left, now) || left.id - right.id
  );
  const picked: T[] = [];
  let fresh = 0;
  for (const word of ranked) {
    if (!word.lastPractice) {
      if (fresh >= NEW_WORD_LIMIT) continue;
      fresh += 1;
    }
    picked.push(word);
  }
  return picked;
}

function matchStep(group: FlashcardWord[]): MatchStep {
  return {
    type: "match",
    pairs: group.map((word) => ({
      word,
      translation: primaryTranslation(word) ?? "",
    })),
  };
}

function canMatch(group: FlashcardWord[]) {
  if (group.length < 4) return false;
  const seen = new Set<string>();
  for (const word of group) {
    const translation = primaryTranslation(word);
    if (!translation) return false;
    const key = translation.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

function listenOrRecall(
  word: FlashcardWord,
  words: FlashcardWord[],
  random: () => number,
  retry = false
): ListenStep | RecallStep {
  const options = listenOptions(word, words, random);
  if (options.length < 2) return { type: "recall", word, ...(retry ? { retry: true } : {}) };
  return { type: "listen", word, options, ...(retry ? { retry: true } : {}) };
}

export function recognitionRetry(
  word: FlashcardWord,
  words: FlashcardWord[],
  random: () => number = Math.random
): ListenStep | RecallStep {
  return listenOrRecall(word, words, random, true);
}

export function buildFlashcardQueue(
  words: FlashcardWord[],
  random: () => number = Math.random,
  clozes: ClozeSource[] = []
): FlashcardStep[] {
  const steps: FlashcardStep[] = [];
  const clozeById = new Map(clozes.map((cloze) => [cloze.wordId, cloze]));
  const buffer: Array<{ word: FlashcardWord; fresh: boolean }> = [];
  let fresh = 0;

  const emitMatch = () => {
    const group = buffer.splice(0, 4).map((item) => item.word);
    if (!canMatch(group) || steps.length >= SESSION_CARDS) {
      buffer.unshift(...group.map((word) => ({ word, fresh: !word.lastPractice })));
      return false;
    }
    steps.push(matchStep(group));
    return true;
  };

  const flushBuffer = () => {
    while (buffer.length >= 4 && steps.length < SESSION_CARDS) {
      if (!emitMatch()) break;
    }
    for (const item of buffer.splice(0)) {
      if (steps.length >= SESSION_CARDS) break;
      steps.push(
        item.fresh
          ? { type: "recall", word: item.word }
          : listenOrRecall(item.word, words, random)
      );
    }
  };

  for (const word of words) {
    if (steps.length >= SESSION_CARDS && buffer.length < 4) break;
    if (!word.lastPractice) {
      if (fresh >= NEW_WORD_LIMIT) continue;
      fresh += 1;
      buffer.push({ word, fresh: true });
      if (buffer.length === 4) emitMatch();
      continue;
    }
    if (clampLevel(word.confidence) <= 2) {
      buffer.push({ word, fresh: false });
      if (buffer.length === 4) emitMatch();
      continue;
    }
    if (steps.length >= SESSION_CARDS) continue;
    const cloze = clozeById.get(word.id);
    if (cloze && isSingleWordName(word.name)) {
      steps.push({
        type: "cloze",
        word,
        sentence: cloze.sentence,
        answer: cloze.answer,
      });
      continue;
    }
    steps.push({ type: "recall", word });
  }

  flushBuffer();
  return steps.slice(0, SESSION_CARDS);
}
