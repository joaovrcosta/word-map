import winkLemmatizer from "wink-lemmatizer";

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

export function lemmatizeWord(word: string): string {
  const forms = getLemmaForms(word);
  const normalized = normalizeToken(word);
  const alternatives = forms.filter((form) => form !== normalized);
  if (alternatives.length === 0) return normalized;
  return alternatives.sort((a, b) => a.length - b.length)[0];
}

export function getLemmaForms(word: string): string[] {
  const normalized = normalizeToken(word);
  if (!normalized) return [];

  const forms = new Set<string>([normalized]);
  forms.add(winkLemmatizer.noun(normalized).toLowerCase());
  forms.add(winkLemmatizer.verb(normalized).toLowerCase());
  forms.add(winkLemmatizer.adjective(normalized).toLowerCase());

  if (normalized.includes("-")) {
    for (const part of normalized.split("-")) {
      if (part.length >= 2) {
        for (const form of getLemmaForms(part)) {
          forms.add(form);
        }
      }
    }
  }

  return [...forms];
}

export function extractTextTokens(content: string): string[] {
  const matches = content.match(TOKEN_REGEX) ?? [];
  return matches.map((token) => normalizeToken(token)).filter(Boolean);
}

interface VaultWordRef {
  vault: MatchableVault;
  word: MatchableWord;
}

export function buildVaultMatchIndex(
  userVaults: MatchableVault[]
): Map<string, VaultWordRef[]> {
  const index = new Map<string, VaultWordRef[]>();

  for (const vault of userVaults) {
    for (const word of vault.words) {
      for (const form of getLemmaForms(word.name)) {
        const existing = index.get(form) ?? [];
        existing.push({ vault, word });
        index.set(form, existing);
      }
    }
  }

  return index;
}

function getMatchKeysForToken(token: string): string[] {
  return getLemmaForms(token);
}

export interface FoundWordMatch {
  word: string;
  vaultInfo: MatchableVault[];
}

export function matchTextToVaultWords(
  content: string,
  userVaults: MatchableVault[]
): FoundWordMatch[] {
  const index = buildVaultMatchIndex(userVaults);
  const rawMatches = content.match(TOKEN_REGEX) ?? [];
  const surfaceForms = new Map<
    string,
    Map<number, { vault: MatchableVault; words: MatchableWord[] }>
  >();
  const displaySurfaces = new Map<string, string>();

  for (const rawToken of rawMatches) {
    const displaySurface = rawToken.replace(
      /^[^a-z0-9'-]+|[^a-z0-9'-]+$/gi,
      ""
    );
    const normalized = normalizeToken(displaySurface);
    if (!normalized || normalized.length < 2) continue;

    const matchKeys = getMatchKeysForToken(normalized);
    const matchedRefs = new Map<number, VaultWordRef>();

    for (const key of matchKeys) {
      const refs = index.get(key) ?? [];
      for (const ref of refs) {
        matchedRefs.set(ref.word.id, ref);
      }
    }

    if (matchedRefs.size === 0) continue;

    const surfaceKey = displaySurface.toLowerCase();
    displaySurfaces.set(surfaceKey, displaySurface);

    const vaultMap =
      surfaceForms.get(surfaceKey) ??
      new Map<number, { vault: MatchableVault; words: MatchableWord[] }>();

    for (const ref of matchedRefs.values()) {
      const existing = vaultMap.get(ref.vault.id);
      if (existing) {
        if (!existing.words.some((w) => w.id === ref.word.id)) {
          existing.words.push(ref.word);
        }
      } else {
        vaultMap.set(ref.vault.id, {
          vault: ref.vault,
          words: [ref.word],
        });
      }
    }

    surfaceForms.set(surfaceKey, vaultMap);
  }

  return [...surfaceForms.entries()].map(([surfaceKey, vaultMap]) => ({
    word: displaySurfaces.get(surfaceKey) ?? surfaceKey,
    vaultInfo: [...vaultMap.values()].map(({ vault, words }) => ({
      id: vault.id,
      name: vault.name,
      createdAt: vault.createdAt,
      updatedAt: vault.updatedAt,
      userId: vault.userId,
      words,
    })),
  }));
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
