export const TOKEN_REGEX = /\b[a-z]+(?:'[a-z]+)?(?:-[a-z]+)*\b/gi;

/**
 * Separadores tipográficos entre palavras coladas:
 * travessão (school—ever) e reticências (talk...less / talk…less).
 * Hífen ASCII (-) permanece em compostos (well-known).
 */
export const WORD_BREAK_SEPARATOR =
  /\.{2,}|\u2026|[\u2012\u2013\u2014\u2212]/g;

export type WordSpan = {
  start: number;
  end: number;
  surface: string;
};

/** Spans tocáveis: quebra em whitespace, travessão e reticências. */
export function iterateWordSpans(text: string): WordSpan[] {
  const spans: WordSpan[] = [];
  for (const match of text.matchAll(/\S+/g)) {
    const chunkStart = match.index ?? 0;
    const chunk = match[0];
    let last = 0;
    const separator = new RegExp(WORD_BREAK_SEPARATOR.source, "g");
    let breakMatch: RegExpExecArray | null = separator.exec(chunk);
    while (breakMatch) {
      if (breakMatch.index > last) {
        spans.push({
          start: chunkStart + last,
          end: chunkStart + breakMatch.index,
          surface: chunk.slice(last, breakMatch.index),
        });
      }
      last = breakMatch.index + breakMatch[0].length;
      breakMatch = separator.exec(chunk);
    }
    if (last < chunk.length) {
      spans.push({
        start: chunkStart + last,
        end: chunkStart + chunk.length,
        surface: chunk.slice(last),
      });
    }
  }
  return spans;
}

export interface MatchableWord {
  id: number;
  name: string;
  grammaticalClass: string;
  category: string | null;
  translations: string[];
  confidence: number;
  isSaved: boolean;
  frequency: number;
  vaultId: number;
  createdAt: Date;
}

export interface MatchableVault {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  words: MatchableWord[];
}

export interface TextToken {
  surface: string;
  normalized: string;
  index: number;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const WORD_EDGE_CHAR = /[\p{L}\p{N}'’-]/u;

export function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/^[^a-z0-9'-]+|[^a-z0-9'-]+$/gi, "")
    .trim();
}

export function splitTokenEdges(surface: string): {
  leading: string;
  core: string;
  trailing: string;
} {
  let start = 0;
  let end = surface.length;

  while (start < end && !WORD_EDGE_CHAR.test(surface[start] ?? "")) start += 1;
  while (end > start && !WORD_EDGE_CHAR.test(surface[end - 1] ?? "")) end -= 1;

  if (start >= end) {
    return { leading: "", core: surface, trailing: "" };
  }

  return {
    leading: surface.slice(0, start),
    core: surface.slice(start, end),
    trailing: surface.slice(end),
  };
}

export function normalizePhrase(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/^[^a-z0-9'-]+|[^a-z0-9'-]+$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitTwoWordPhrase(text: string): [string, string] | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (/\s/.test(trimmed)) {
    const parts = normalizePhrase(trimmed).split(" ").filter(Boolean);
    return parts.length === 2 ? [parts[0], parts[1]] : null;
  }

  if (trimmed.includes("-")) {
    const parts = trimmed
      .split("-")
      .map((part) => normalizeToken(part))
      .filter(Boolean);
    return parts.length === 2 ? [parts[0], parts[1]] : null;
  }

  return null;
}

export function isTwoWordPhrase(text: string): boolean {
  return splitTwoWordPhrase(text) !== null;
}

/** Partículas comuns de phrasal verb (sem lemmatizer — ok no client). */
export const PHRASAL_PARTICLES = new Set([
  "about",
  "around",
  "away",
  "back",
  "by",
  "down",
  "in",
  "into",
  "off",
  "on",
  "out",
  "over",
  "through",
  "up",
]);

/** Heurística: duas palavras e a segunda é partícula (ex.: pick up). */
export function looksLikePhrasalVerb(text: string): boolean {
  const parts = splitTwoWordPhrase(text);
  if (!parts) return false;
  return PHRASAL_PARTICLES.has(parts[1]);
}

export function extractTextTokens(content: string): string[] {
  const matches = content.match(TOKEN_REGEX) ?? [];
  return matches.map((token) => normalizeToken(token)).filter(Boolean);
}

export function extractTextTokenStream(content: string): TextToken[] {
  const regex = new RegExp(TOKEN_REGEX.source, TOKEN_REGEX.flags);
  const tokens: TextToken[] = [];

  for (const match of content.matchAll(regex)) {
    const surface = match[0].replace(/^[^a-z0-9'-]+|[^a-z0-9'-]+$/gi, "");
    const normalized = normalizeToken(surface);
    if (!normalized) continue;

    tokens.push({
      surface,
      normalized,
      index: tokens.length,
    });
  }

  return tokens;
}

export function buildBigramSurface(tokens: TextToken[], index: number): string | null {
  return buildNgramSurface(tokens, index, 2);
}

export function buildNgramSurface(
  tokens: TextToken[],
  index: number,
  size: number
): string | null {
  if (size < 2 || index < 0 || index + size > tokens.length) return null;
  return tokens
    .slice(index, index + size)
    .map((token) => token.surface)
    .join(" ");
}

export function parseSelectionTokens(text: string): string[] {
  const regex = new RegExp(TOKEN_REGEX.source, TOKEN_REGEX.flags);
  const tokens: string[] = [];

  for (const match of text.matchAll(regex)) {
    const normalized = normalizeToken(match[0]);
    if (normalized) tokens.push(normalized);
  }

  return tokens;
}

export const DEFAULT_WORDS_VAULT_NAME = "Meu dicionario";
export const DEFAULT_PHRASES_VAULT_NAME = "Minhas frases";
export const MAX_PHRASE_WORDS = 6;

export function isValidSelectionForSave(tokens: string[]): boolean {
  return tokens.length >= 2 && tokens.length <= MAX_PHRASE_WORDS;
}

export function isPhraseName(name: string): boolean {
  return normalizePhrase(name).split(" ").filter(Boolean).length >= 2;
}

export function getSelectionDisplayText(text: string): string {
  return normalizePhrase(text);
}

export const HIGHLIGHT_PREFIX = "__HL__";
export const HIGHLIGHT_SUFFIX = "__HL__";

export function createHighlightMarker(word: string): string {
  return `${HIGHLIGHT_PREFIX}${encodeURIComponent(word)}${HIGHLIGHT_SUFFIX}`;
}

export function parseHighlightMarker(part: string): string | null {
  if (!part.startsWith(HIGHLIGHT_PREFIX) || !part.endsWith(HIGHLIGHT_SUFFIX)) {
    return null;
  }

  const encoded = part.slice(
    HIGHLIGHT_PREFIX.length,
    part.length - HIGHLIGHT_SUFFIX.length
  );

  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

export function splitHighlightParts(content: string): string[] {
  const regex = new RegExp(
    `(${escapeRegExp(HIGHLIGHT_PREFIX)}.*?${escapeRegExp(HIGHLIGHT_SUFFIX)})`,
    "g"
  );
  return content.split(regex);
}

export function extractRelatedSentences(
  content: string,
  word: string,
  limit = 8
): string[] {
  const needle = normalizeToken(word);
  if (!needle || !content.trim()) return [];

  const sentences = content
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const fromSentences = sentences.filter((sentence) =>
    extractTextTokens(sentence).includes(needle)
  );

  const windows: string[] = [];
  const tokens = extractTextTokenStream(content);
  tokens.forEach((token, index) => {
    if (token.normalized !== needle) return;
    const start = Math.max(0, index - 2);
    const end = Math.min(tokens.length, index + 3);
    const phrase = tokens
      .slice(start, end)
      .map((item) => item.surface)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (phrase) windows.push(phrase);
  });

  const unique: string[] = [];
  for (const phrase of [...fromSentences, ...windows]) {
    const key = phrase.toLowerCase();
    if (unique.some((item) => item.toLowerCase() === key)) continue;
    unique.push(phrase);
    if (unique.length >= limit) break;
  }

  return unique;
}
