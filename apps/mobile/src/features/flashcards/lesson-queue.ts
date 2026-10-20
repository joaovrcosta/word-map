import { stepWordIds, type FlashcardStep, type MatchPair } from "@word-map/shared";
import { LESSON_KINDS, type LessonKind, type PracticeMark, type WordFocus } from "./types";

export const LESSON_MIN = 15;
export const LESSON_MAX = 20;

const KIND_LABEL: Record<LessonKind, string> = {
  recall: "recordar",
  listen: "ouvir",
  match: "combinar",
  cloze: "completar",
};

export function focusKey(vaultId: number) {
  return `wordmap-flashcard-focus-${vaultId}`;
}

export function isLessonKind(value: unknown): value is LessonKind {
  return typeof value === "string" && LESSON_KINDS.includes(value as LessonKind);
}

export function shuffleItems<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }
  return copy;
}

export function shufflePairs(pairs: MatchPair[]) {
  return shuffleItems(pairs);
}

function pickLessonCount(available: number) {
  if (available <= LESSON_MIN) return available;
  const max = Math.min(LESSON_MAX, available);
  return LESSON_MIN + Math.floor(Math.random() * (max - LESSON_MIN + 1));
}

function isWeakResult(kind: LessonKind, result: string) {
  if (kind === "recall") return result === "1" || result === "2";
  return result === "miss";
}

export function focusFromMarks(marks: PracticeMark[]): WordFocus[] {
  const byId = new Map<number, Set<LessonKind>>();
  for (const mark of marks) {
    if (!isWeakResult(mark.kind, mark.result)) continue;
    const kinds = byId.get(mark.id) ?? new Set<LessonKind>();
    kinds.add(mark.kind);
    byId.set(mark.id, kinds);
  }
  return [...byId.entries()].map(([id, kinds]) => ({ id, kinds: [...kinds] }));
}

export function practiceLine(focus: WordFocus[]) {
  const kinds = LESSON_KINDS.filter((kind) => focus.some((word) => word.kinds.includes(kind)));
  if (kinds.length === 0) return null;
  const names = kinds.map((kind) => KIND_LABEL[kind]);
  if (names.length === 1) return `Na próxima sessão, vamos praticar mais ${names[0]}.`;
  const last = names[names.length - 1];
  return `Na próxima sessão, vamos praticar mais ${names.slice(0, -1).join(", ")} e ${last}.`;
}

function unclump(steps: FlashcardStep[]) {
  const pending = [...steps];
  const ordered: FlashcardStep[] = [];
  let last: LessonKind | null = null;
  while (pending.length > 0) {
    const different = pending.findIndex((step) => step.type !== last);
    const chosen = pending.splice(different === -1 ? 0 : different, 1)[0];
    ordered.push(chosen);
    last = chosen.type;
  }
  return ordered;
}

export function mixLessonSteps(steps: FlashcardStep[], focus: WordFocus[]) {
  const limit = pickLessonCount(steps.length);
  const focusByWord = new Map(focus.map((item) => [item.id, new Set(item.kinds)]));
  const preferred: FlashcardStep[] = [];
  const other: FlashcardStep[] = [];

  for (const step of steps) {
    const wanted = stepWordIds(step).some((id) => focusByWord.get(id)?.has(step.type));
    if (wanted) preferred.push(step);
    else other.push(step);
  }

  const buckets = new Map<LessonKind, FlashcardStep[]>(LESSON_KINDS.map((kind) => [kind, []]));
  for (const step of [...preferred, ...other]) {
    buckets.get(step.type)?.push(step);
  }

  const focusedKinds = new Set(focus.flatMap((item) => item.kinds));
  const picked: FlashcardStep[] = [];
  let guard = 0;
  while (picked.length < limit && guard < 500) {
    guard += 1;
    let took = false;
    for (const kind of LESSON_KINDS) {
      const bucket = buckets.get(kind);
      if (!bucket || bucket.length === 0) continue;
      const pulls = focusedKinds.has(kind) ? 2 : 1;
      for (let count = 0; count < pulls && bucket.length > 0 && picked.length < limit; count += 1) {
        const step = bucket.shift();
        if (!step) break;
        picked.push(step);
        took = true;
      }
    }
    if (!took) break;
  }

  return unclump(picked);
}
