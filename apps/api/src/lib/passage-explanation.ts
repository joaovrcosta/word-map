import { prisma } from "../prisma/client";
import { passageExplanationKey } from "./tutor";

export type SavedPassage = {
  explanation: string;
  translation: string | null;
};

export async function readPassageExplanation(
  userId: number,
  span: string,
  sentence: string
): Promise<SavedPassage | null> {
  const row = await prisma.wordPassageExplanation.findUnique({
    where: {
      userId_passageKey: {
        userId,
        passageKey: passageExplanationKey(span, sentence),
      },
    },
  });
  if (!row?.explanation) return null;
  return {
    explanation: row.explanation,
    translation: row.translation,
  };
}

export async function writePassageExplanation(input: {
  userId: number;
  span: string;
  sentence: string;
  explanation: string;
  translation?: string | null;
  wordId?: number | null;
}): Promise<void> {
  const passageKey = passageExplanationKey(input.span, input.sentence);
  let wordId: number | null = null;
  if (input.wordId) {
    const word = await prisma.word.findFirst({
      where: { id: input.wordId, vault: { userId: input.userId } },
      select: { id: true },
    });
    wordId = word?.id ?? null;
  }

  await prisma.wordPassageExplanation.upsert({
    where: { userId_passageKey: { userId: input.userId, passageKey } },
    create: {
      userId: input.userId,
      wordId,
      passageKey,
      span: input.span.trim(),
      sentence: input.sentence.trim(),
      explanation: input.explanation,
      translation: input.translation ?? null,
    },
    update: {
      explanation: input.explanation,
      translation: input.translation ?? null,
      span: input.span.trim(),
      sentence: input.sentence.trim(),
      ...(wordId ? { wordId } : {}),
    },
  });
}
