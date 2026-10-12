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

export function answersMatch(input: string, answer: string): boolean {
  const expected = normalizeClozeAnswer(answer);
  if (!expected) return false;
  return normalizeClozeAnswer(input) === expected;
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
