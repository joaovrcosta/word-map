const TOKEN_REGEX = /\b[a-z]+(?:'[a-z]+)?(?:-[a-z]+)*\b/gi;

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

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/^[^a-z0-9'-]+|[^a-z0-9'-]+$/gi, "")
    .trim();
}

export function extractTextTokens(content: string): string[] {
  const matches = content.match(TOKEN_REGEX) ?? [];
  return matches.map((token) => normalizeToken(token)).filter(Boolean);
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
