export type SpeakAlignStatus = "pending" | "correct" | "wrong";

export type AlignSpokenOptions = {
  finalized?: boolean;
};

const LOOKAHEAD = 2;

/** 1:1 display synonyms (normalized). */
const SYNONYMS: Record<string, string> = {
  color: "colour",
  colour: "color",
  gray: "grey",
  grey: "gray",
  theater: "theatre",
  theatre: "theater",
};

const NUMBER_WORDS: Record<string, string> = {
  "0": "zero",
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
  "10": "ten",
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
};

/**
 * Expected display token(s) joined ↔ spoken form(s).
 * Keys/values are space-separated normalized tokens.
 */
const PHRASE_FORMS: Array<{ expected: string; spoken: string }> = [
  { expected: "i'm", spoken: "i am" },
  { expected: "i am", spoken: "i'm" },
  { expected: "you're", spoken: "you are" },
  { expected: "you are", spoken: "you're" },
  { expected: "we're", spoken: "we are" },
  { expected: "we are", spoken: "we're" },
  { expected: "they're", spoken: "they are" },
  { expected: "they are", spoken: "they're" },
  { expected: "he's", spoken: "he is" },
  { expected: "he is", spoken: "he's" },
  { expected: "she's", spoken: "she is" },
  { expected: "she is", spoken: "she's" },
  { expected: "it's", spoken: "it is" },
  { expected: "it is", spoken: "it's" },
  { expected: "don't", spoken: "do not" },
  { expected: "do not", spoken: "don't" },
  { expected: "doesn't", spoken: "does not" },
  { expected: "does not", spoken: "doesn't" },
  { expected: "didn't", spoken: "did not" },
  { expected: "did not", spoken: "didn't" },
  { expected: "won't", spoken: "will not" },
  { expected: "will not", spoken: "won't" },
  { expected: "can't", spoken: "cannot" },
  { expected: "cannot", spoken: "can't" },
  { expected: "going to", spoken: "gonna" },
  { expected: "gonna", spoken: "going to" },
  { expected: "want to", spoken: "wanna" },
  { expected: "wanna", spoken: "want to" },
  { expected: "got to", spoken: "gotta" },
  { expected: "gotta", spoken: "got to" },
];

export function normalizeSpeakToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/gi, "")
    .replace(/’/g, "'")
    .trim();
}

export function tokenizeSpeakText(text: string): string[] {
  return text
    .replace(/[^\w\s'-]/g, " ")
    .replace(/’/g, "'")
    .split(/\s+/)
    .map((part) => normalizeSpeakToken(part))
    .filter(Boolean);
}

function editDistance(left: string, right: string): number {
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

export function tokensMatch(left: string, right: string): boolean {
  const a = normalizeSpeakToken(left);
  const b = normalizeSpeakToken(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (SYNONYMS[a] === b || SYNONYMS[b] === a) return true;
  if (NUMBER_WORDS[a] === b || NUMBER_WORDS[b] === a) return true;
  if (a.length >= 5 && b.length >= 5 && editDistance(a, b) <= 1) return true;
  return false;
}

type SpanMatch = { expectedCount: number; spokenCount: number };

function tryPhraseFormMatch(
  expected: string[],
  spoken: string[],
  i: number,
  j: number
): SpanMatch | null {
  for (const form of PHRASE_FORMS) {
    const expParts = form.expected.split(" ").filter(Boolean);
    const spParts = form.spoken.split(" ").filter(Boolean);
    if (i + expParts.length > expected.length) continue;
    if (j + spParts.length > spoken.length) continue;
    const expSlice = expected.slice(i, i + expParts.length);
    const spSlice = spoken.slice(j, j + spParts.length);
    const expOk = expParts.every((part, index) => tokensMatch(part, expSlice[index]!));
    const spOk = spParts.every((part, index) => tokensMatch(part, spSlice[index]!));
    if (expOk && spOk) {
      return { expectedCount: expParts.length, spokenCount: spParts.length };
    }
  }
  return null;
}

function tryDirectMatch(
  expected: string[],
  spoken: string[],
  i: number,
  j: number
): SpanMatch | null {
  if (i >= expected.length || j >= spoken.length) return null;
  const phrase = tryPhraseFormMatch(expected, spoken, i, j);
  if (phrase) return phrase;
  if (tokensMatch(expected[i]!, spoken[j]!)) {
    return { expectedCount: 1, spokenCount: 1 };
  }
  return null;
}

/**
 * Align spoken transcript to expected display tokens (1:1 with UI words).
 * Lookahead on expected (omit) wins over lookahead on spoken (extra).
 */
export function alignSpokenWords(
  expectedText: string,
  spokenText: string,
  options: AlignSpokenOptions = {}
): SpeakAlignStatus[] {
  const finalized = Boolean(options.finalized);
  const expected = tokenizeSpeakText(expectedText);
  let spoken = tokenizeSpeakText(spokenText);

  if (!finalized && spoken.length > 0) {
    spoken = spoken.slice(0, -1);
  }

  const statuses: SpeakAlignStatus[] = expected.map(() => "pending");
  let i = 0;
  let j = 0;

  while (i < expected.length && j < spoken.length) {
    const direct = tryDirectMatch(expected, spoken, i, j);
    if (direct) {
      for (let offset = 0; offset < direct.expectedCount; offset += 1) {
        statuses[i + offset] = "correct";
      }
      i += direct.expectedCount;
      j += direct.spokenCount;
      continue;
    }

    // Priority A: lookahead on expected (spoken matches a later expected token)
    let matchedExpectedLookahead = false;
    for (let k = 1; k <= LOOKAHEAD; k += 1) {
      if (i + k >= expected.length) break;
      const hit = tryDirectMatch(expected, spoken, i + k, j);
      if (!hit) continue;
      for (let offset = 0; offset < hit.expectedCount; offset += 1) {
        statuses[i + k + offset] = "correct";
      }
      i += k + hit.expectedCount;
      j += hit.spokenCount;
      matchedExpectedLookahead = true;
      break;
    }
    if (matchedExpectedLookahead) continue;

    // Priority B: lookahead on spoken (extra filler words)
    let matchedSpokenLookahead = false;
    for (let k = 1; k <= LOOKAHEAD; k += 1) {
      if (j + k >= spoken.length) break;
      const hit = tryDirectMatch(expected, spoken, i, j + k);
      if (!hit) continue;
      for (let offset = 0; offset < hit.expectedCount; offset += 1) {
        statuses[i + offset] = "correct";
      }
      i += hit.expectedCount;
      j += k + hit.spokenCount;
      matchedSpokenLookahead = true;
      break;
    }
    if (matchedSpokenLookahead) continue;

    if (!finalized) {
      j += 1;
      continue;
    }

    statuses[i] = "wrong";
    i += 1;
    j += 1;
  }

  return statuses;
}

export function speakAllowedErrors(expectedCount: number): number {
  if (expectedCount < 5) return 0;
  return Math.max(1, Math.floor(expectedCount * 0.15));
}

export function speakPassScore(statuses: SpeakAlignStatus[]): boolean {
  const n = statuses.length;
  if (n === 0) return false;
  const correct = statuses.filter((status) => status === "correct").length;
  const errors = n - correct;
  return errors <= speakAllowedErrors(n);
}
