import "server-only";

import type { MatchableVault } from "@/lib/word-matching";
import { normalizeToken } from "@/lib/word-matching";

const TOKEN_REGEX = /\b[a-z]+(?:'[a-z]+)?(?:-[a-z]+)*\b/gi;

interface WinkLemmatizer {
  noun(word: string): string;
  verb(word: string): string;
  adjective(word: string): string;
}

// CommonJS package — require evita problemas de interop com webpack no client bundle.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const winkLemmatizer = require("wink-lemmatizer") as WinkLemmatizer;

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

interface VaultWordRef {
  vault: MatchableVault;
  word: MatchableVault["words"][number];
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
    Map<number, { vault: MatchableVault; words: MatchableVault["words"] }>
  >();
  const displaySurfaces = new Map<string, string>();

  for (const rawToken of rawMatches) {
    const displaySurface = rawToken.replace(
      /^[^a-z0-9'-]+|[^a-z0-9'-]+$/gi,
      ""
    );
    const normalized = normalizeToken(displaySurface);
    if (!normalized || normalized.length < 2) continue;

    const matchKeys = getLemmaForms(normalized);
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
      new Map<
        number,
        { vault: MatchableVault; words: MatchableVault["words"] }
      >();

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
