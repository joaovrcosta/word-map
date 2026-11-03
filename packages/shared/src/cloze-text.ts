export const CLOZE_MAX_ATTEMPTS = 2;

const tokenPattern = () => /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;

export type AnswerSpan = { start: number; end: number };

export type SentencePart =
  | { type: "text"; value: string }
  | { type: "blank" };

export function isSingleWordName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  return /^[A-Za-z]+(?:['’-][A-Za-z]+)*$/.test(trimmed);
}

export function findAnswerSpans(sentence: string, answer: string): AnswerSpan[] {
  const target = answer.trim().toLowerCase();
  if (!target) return [];
  const spans: AnswerSpan[] = [];
  for (const match of sentence.matchAll(tokenPattern())) {
    if (match.index === undefined) continue;
    if (match[0].toLowerCase() !== target) continue;
    spans.push({ start: match.index, end: match.index + match[0].length });
  }
  return spans;
}

export function acceptClozeSentence(sentence: string, vaultName: string): boolean {
  if (!isSingleWordName(vaultName)) return false;
  return findAnswerSpans(sentence, vaultName).length > 0;
}

export function splitSentenceAtAnswer(
  sentence: string,
  answer: string
): SentencePart[] {
  const spans = findAnswerSpans(sentence, answer);
  if (spans.length === 0) return [{ type: "text", value: sentence }];

  const parts: SentencePart[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) {
      parts.push({ type: "text", value: sentence.slice(cursor, span.start) });
    }
    parts.push({ type: "blank" });
    cursor = span.end;
  }
  if (cursor < sentence.length) {
    parts.push({ type: "text", value: sentence.slice(cursor) });
  }
  return parts;
}

export function normalizeClozeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[^a-z]+|[^a-z]+$/g, "");
}

function clozeEditDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const rows = left.length + 1;
  const cols = right.length + 1;
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) grid[i]![0] = i;
  for (let j = 0; j < cols; j += 1) grid[0]![j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      grid[i]![j] = Math.min(
        grid[i - 1]![j]! + 1,
        grid[i]![j - 1]! + 1,
        grid[i - 1]![j - 1]! + cost
      );
    }
  }
  return grid[rows - 1]![cols - 1]!;
}

/** Singular/plural e 1 typo (ex.: village ↔ villages). Não aceita pedaço incompleto (medice ≠ medicine). */
export function answersNearlyEqual(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (left === right) return true;
  if (left + "s" === right || right + "s" === left) return true;
  if (left + "es" === right || right + "es" === left) return true;
  if (left.endsWith("y") && left.slice(0, -1) + "ies" === right) return true;
  if (right.endsWith("y") && right.slice(0, -1) + "ies" === left) return true;
  // Só 1 letra de diferença, e comprimentos quase iguais (evita "medice" ≈ "medicine").
  if (Math.abs(left.length - right.length) > 1) return false;
  const minLen = Math.min(left.length, right.length);
  return minLen >= 5 && clozeEditDistance(left, right) <= 1;
}

export function answersMatch(input: string, answer: string): boolean {
  const expected = normalizeClozeAnswer(answer);
  if (!expected) return false;
  const got = normalizeClozeAnswer(input);
  if (!got) return false;
  return answersNearlyEqual(got, expected);
}

export function clozeTranslationHint(
  translations: string[],
  answer: string
): string {
  for (const item of translations) {
    const hint = item.trim();
    if (!hint || answersMatch(hint, answer)) continue;
    return hint;
  }
  return "";
}

export function shouldRecordClozeResult(attempts: number): boolean {
  return attempts === 1;
}

export function shouldRequeueCloze(attempts: number, correct: boolean): boolean {
  return !correct && attempts < CLOZE_MAX_ATTEMPTS;
}
