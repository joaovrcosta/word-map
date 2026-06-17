export const TOKEN_REGEX = /\b[a-z]+(?:'[a-z]+)?(?:-[a-z]+)*\b/gi;

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

export function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/^[^a-z0-9'-]+|[^a-z0-9'-]+$/gi, "")
    .trim();
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

export function isValidSelectionForSave(tokens: string[]): boolean {
  return tokens.length === 2 || tokens.length === 3;
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
