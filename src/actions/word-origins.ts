"use server";

import { getCurrentUser } from "@/actions/auth";
import { prisma } from "@/lib/prisma";
import { writeWordOrigins } from "@/lib/word-origin-store";
import type { WordOriginKind } from "@/lib/word-origin";

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
