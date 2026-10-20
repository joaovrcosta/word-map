
import { getCurrentUser } from "../auth/current-user";
import { prisma } from "../prisma/client";
import { writeWordOrigins } from "../lib/word-origin-store";
import type { WordOriginKind } from "@word-map/shared/word-origin";

export type WordOriginEntry = {
  id: number;
  meaning: string;
  sentence: string | null;
  sourceTitle: string | null;
  sourceKind: string;
  createdAt: string;
};

async function readOrigins(wordId: number): Promise<WordOriginEntry[]> {
  const rows = await prisma.wordOrigin.findMany({
    where: { wordId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      meaning: true,
      sentence: true,
      sourceTitle: true,
      sourceKind: true,
      createdAt: true,
    },
  });
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export type BookWordEntry = {
  id: number;
  name: string;
  translations: string[];
  grammaticalClass: string;
  confidence: number;
  meaning: string;
  sentence: string | null;
};

export async function listWordsSavedInBook(title: string): Promise<BookWordEntry[]> {
  const user = await getCurrentUser();
  const sourceTitle = title.trim();
  if (!user || !sourceTitle) return [];

  const rows = await prisma.wordOrigin.findMany({
    where: {
      sourceKind: "book",
      sourceTitle: { equals: sourceTitle, mode: "insensitive" },
      word: { vault: { userId: user.id } },
    },
    orderBy: { createdAt: "desc" },
    select: {
      meaning: true,
      sentence: true,
      word: {
        select: {
          id: true,
          name: true,
          translations: true,
          grammaticalClass: true,
          confidence: true,
        },
      },
    },
  });

  const seen = new Set<number>();
  const words: BookWordEntry[] = [];
  for (const row of rows) {
    if (seen.has(row.word.id)) continue;
    seen.add(row.word.id);
    words.push({
      id: row.word.id,
      name: row.word.name,
      translations: row.word.translations,
      grammaticalClass: row.word.grammaticalClass,
      confidence: row.word.confidence,
      meaning: row.meaning,
      sentence: row.sentence,
    });
  }
  return words;
}

export async function listWordOrigins(wordId: number): Promise<WordOriginEntry[]> {
  const user = await getCurrentUser();
  if (!user || !Number.isInteger(wordId) || wordId <= 0) return [];
  const owned = await prisma.word.findFirst({
    where: { id: wordId, vault: { userId: user.id } },
    select: { id: true },
  });
  if (!owned) return [];
  return readOrigins(owned.id);
}

export async function recordWordOrigin(input: {
  wordId?: number;
  wordName: string;
  vaultId?: number;
  meaning: string;
  sentence?: string | null;
  sourceTitle?: string | null;
  sourceKind?: WordOriginKind;
}): Promise<WordOriginEntry[]> {
  const user = await getCurrentUser();
  const meaning = input.meaning.trim();
  if (!user || !meaning) return [];

  const word = input.wordId
    ? await prisma.word.findFirst({
        where: { id: input.wordId, vault: { userId: user.id } },
        select: { id: true },
      })
    : input.vaultId
      ? await prisma.word.findFirst({
          where: {
            vaultId: input.vaultId,
            vault: { userId: user.id },
            name: { equals: input.wordName.trim(), mode: "insensitive" },
          },
          select: { id: true },
        })
      : null;
  if (!word) return [];

  await writeWordOrigins(word.id, [meaning], {
    sentence: input.sentence,
    sourceTitle: input.sourceTitle,
    sourceKind: input.sourceKind,
  });
  return readOrigins(word.id);
}
