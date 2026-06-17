import "server-only";

import type { MatchableVault } from "@/lib/word-matching";
import {
  buildBigramSurface,
  buildNgramSurface,
  extractTextTokenStream,
  normalizePhrase,
  normalizeToken,
  splitTwoWordPhrase,
} from "@/lib/word-matching";
import {
  extractDictionaryGrammaticalClass,
  extractDictionaryTranslations,
  fetchDictionaryEntry,
} from "@/lib/dictionary";
import { translateToPortugueseServer } from "@/lib/translate.server";

const TOKEN_REGEX = /\b[a-z]+(?:'[a-z]+)?(?:-[a-z]+)*\b/gi;

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

export function canonicalizePhrasalBigram(
  verbToken: string,
  particleToken: string
): string | null {
  const verb = normalizeToken(verbToken);
  const particle = normalizeToken(particleToken);

  if (!verb || !particle || !PHRASAL_PARTICLES.has(particle)) {
    return null;
  }

  const verbLemma = winkLemmatizer.verb(verb).toLowerCase();
  return `${verbLemma} ${particle}`;
}

export function getPhraseMatchKeys(phrase: string): string[] {
  const parts = splitTwoWordPhrase(phrase);
  if (!parts) return [];

  const canonical = canonicalizePhrasalBigram(parts[0], parts[1]);
  if (!canonical) return [];

  return [canonical];
}

function isPhrasalVaultWord(name: string): boolean {
  const parts = splitTwoWordPhrase(name);
  if (!parts) return false;
  return PHRASAL_PARTICLES.has(parts[1]);
}

function getMultiWordTokenCount(name: string): number {
  return normalizePhrase(name).split(" ").filter(Boolean).length;
}

function isMultiWordVaultEntry(word: MatchableVault["words"][number]): boolean {
  if (isPhrasalVaultWord(word.name)) return false;
  const count = getMultiWordTokenCount(word.name);
  return count >= 2 && count <= 3;
}

function isFraseVaultWord(word: MatchableVault["words"][number]): boolean {
  return word.grammaticalClass === "frase";
}

function isExactPhraseVaultEntry(word: MatchableVault["words"][number]): boolean {
  return isFraseVaultWord(word) || isMultiWordVaultEntry(word);
}

function vaultHasExactPhraseEntries(userVaults: MatchableVault[]): boolean {
  return userVaults.some((vault) =>
    vault.words.some((word) => isExactPhraseVaultEntry(word))
  );
}

function vaultHasPhrasalEntries(userVaults: MatchableVault[]): boolean {
  return userVaults.some((vault) =>
    vault.words.some((word) => isPhrasalVaultWord(word.name))
  );
}

interface VaultWordRef {
  vault: MatchableVault;
  word: MatchableVault["words"][number];
}

export function buildVaultMatchIndex(
  userVaults: MatchableVault[]
): Map<string, VaultWordRef[]> {
  const index = new Map<string, VaultWordRef[]>();

  const addToIndex = (key: string, ref: VaultWordRef) => {
    const existing = index.get(key) ?? [];
    existing.push(ref);
    index.set(key, existing);
  };

  for (const vault of userVaults) {
    for (const word of vault.words) {
      const ref = { vault, word };

      if (isPhrasalVaultWord(word.name)) {
        for (const key of getPhraseMatchKeys(word.name)) {
          addToIndex(key, ref);
        }
        continue;
      }

      if (isExactPhraseVaultEntry(word)) {
        addToIndex(normalizePhrase(word.name), ref);
        continue;
      }

      for (const form of getLemmaForms(word.name)) {
        addToIndex(form, ref);
      }
    }
  }

  return index;
}

export interface FoundWordMatch {
  word: string;
  vaultInfo: MatchableVault[];
}

function registerMatch(
  surfaceForms: Map<
    string,
    Map<number, { vault: MatchableVault; words: MatchableVault["words"] }>
  >,
  displaySurfaces: Map<string, string>,
  displaySurface: string,
  matchedRefs: Map<number, VaultWordRef>
) {
  const surfaceKey = displaySurface.toLowerCase();
  displaySurfaces.set(surfaceKey, displaySurface);

  const vaultMap =
    surfaceForms.get(surfaceKey) ??
    new Map<number, { vault: MatchableVault; words: MatchableVault["words"] }>();

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

export function matchTextToVaultWords(
  content: string,
  userVaults: MatchableVault[]
): FoundWordMatch[] {
  const index = buildVaultMatchIndex(userVaults);
  const surfaceForms = new Map<
    string,
    Map<number, { vault: MatchableVault; words: MatchableVault["words"] }>
  >();
  const displaySurfaces = new Map<string, string>();
  const rawMatches = content.match(TOKEN_REGEX) ?? [];

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

    registerMatch(surfaceForms, displaySurfaces, displaySurface, matchedRefs);
  }

  if (vaultHasPhrasalEntries(userVaults)) {
    const tokens = extractTextTokenStream(content);

    for (let i = 0; i < tokens.length - 1; i += 1) {
      const displaySurface = buildBigramSurface(tokens, i);
      if (!displaySurface) continue;

      const canonical = canonicalizePhrasalBigram(
        tokens[i].normalized,
        tokens[i + 1].normalized
      );
      if (!canonical) continue;

      const refs = index.get(canonical) ?? [];
      if (refs.length === 0) continue;

      const matchedRefs = new Map<number, VaultWordRef>();
      for (const ref of refs) {
        matchedRefs.set(ref.word.id, ref);
      }

      registerMatch(surfaceForms, displaySurfaces, displaySurface, matchedRefs);
    }
  }

  if (vaultHasExactPhraseEntries(userVaults)) {
    const tokens = extractTextTokenStream(content);

    for (const size of [3, 2]) {
      for (let i = 0; i <= tokens.length - size; i += 1) {
        const displaySurface = buildNgramSurface(tokens, i, size);
        if (!displaySurface) continue;

        const phraseKey = normalizePhrase(displaySurface);
        const refs = index.get(phraseKey) ?? [];
        if (refs.length === 0) continue;

        const matchedRefs = new Map<number, VaultWordRef>();
        for (const ref of refs) {
          matchedRefs.set(ref.word.id, ref);
        }

        registerMatch(
          surfaceForms,
          displaySurfaces,
          displaySurface,
          matchedRefs
        );
      }
    }
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

export type SelectionSaveType = "phrasal-verb" | "word" | "frase";

export interface ResolvedSelection {
  name: string;
  grammaticalClass: string;
  translations: string[];
  previewLabel: string;
}

export async function getPhrasalCanonicalPreview(
  selectedText: string
): Promise<string | null> {
  const parts = splitTwoWordPhrase(selectedText);
  if (!parts) return null;
  return canonicalizePhrasalBigram(parts[0], parts[1]);
}

export async function resolveSelectionForSave(
  selectedText: string,
  saveType: SelectionSaveType
): Promise<ResolvedSelection> {
  const trimmed = selectedText.trim();
  if (!trimmed) {
    throw new Error("Seleção vazia");
  }

  if (saveType === "phrasal-verb") {
    const parts = splitTwoWordPhrase(trimmed);
    if (!parts) {
      throw new Error("Phrasal verb exige exatamente duas palavras");
    }

    const canonical = canonicalizePhrasalBigram(parts[0], parts[1]);
    if (!canonical) {
      throw new Error("Seleção não é um phrasal verb válido (verbo + partícula)");
    }

    const entry = await fetchDictionaryEntry(canonical);
    return {
      name: canonical,
      grammaticalClass: "phrasal-verb",
      translations: extractDictionaryTranslations(entry, canonical),
      previewLabel: canonical,
    };
  }

  const name = normalizePhrase(trimmed);

  if (saveType === "frase") {
    const translation = await translateToPortugueseServer(name);
    return {
      name,
      grammaticalClass: "frase",
      translations: [translation],
      previewLabel: name,
    };
  }

  const entry = await fetchDictionaryEntry(name);
  return {
    name,
    grammaticalClass: extractDictionaryGrammaticalClass(entry),
    translations: extractDictionaryTranslations(entry, name),
    previewLabel: name,
  };
}
