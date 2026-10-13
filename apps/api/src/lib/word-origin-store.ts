import { prisma } from "../prisma/client";
import {
  addedMeanings,
  sameWordOrigin,
  type WordOriginInput,
  type WordOriginKind,
} from "@word-map/shared/word-origin";

export { addedMeanings };

const LIMITS = {
  meaning: 180,
  sentence: 500,
  title: 160,
} as const;

function clip(value: string | null | undefined, max: number): string | null {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.slice(0, max);
}

function asKind(value: string | undefined): WordOriginKind {
  if (value === "book" || value === "text") return value;
  return "manual";
}

export async function writeWordOrigins(
  wordId: number,
  meanings: string[],
  origin?: WordOriginInput | null
): Promise<void> {
  const prepared = meanings
    .map((item) => clip(item, LIMITS.meaning))
    .filter((item): item is string => Boolean(item));
  if (prepared.length === 0) return;

  const sentence = clip(origin?.sentence, LIMITS.sentence);
  const sourceTitle = clip(origin?.sourceTitle, LIMITS.title);
  const sourceKind = asKind(origin?.sourceKind);
  const existing = await prisma.wordOrigin.findMany({
    where: { wordId },
    select: { sentence: true, meaning: true },
  });
  const pending = prepared.filter(
    (meaning) =>
      !existing.some((item) => sameWordOrigin(item, { sentence, meaning }))
  );
  if (pending.length === 0) return;

  await prisma.wordOrigin.createMany({
    data: pending.map((meaning) => ({
      wordId,
      meaning,
      sentence,
      sourceTitle,
      sourceKind,
    })),
  });
}
