import {
  applyFsrsRating,
  applyLearningStatusPreset,
  clampReviewedAt,
  migrateLegacyWordToFsrs,
  patchFromCard,
  resolveRating,
  type FsrsCardFields,
  type FsrsWordPatch,
  type LearningStatusId,
} from "@word-map/shared/fsrs-schedule";
import { prisma } from "../prisma/client";
import { recordWordLevel } from "./word-levels";

export type WordFsrsRow = {
  id: number;
  confidence: number;
  lastPractice: Date | null;
  fsrsState: number;
  stability: number | null;
  difficulty: number | null;
  dueAt: Date | null;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReview: Date | null;
};

export const FSRS_WORD_SELECT = {
  id: true,
  confidence: true,
  lastPractice: true,
  fsrsState: true,
  stability: true,
  difficulty: true,
  dueAt: true,
  scheduledDays: true,
  learningSteps: true,
  reps: true,
  lapses: true,
  lastReview: true,
} as const;

export function fieldsFromWord(word: WordFsrsRow): FsrsCardFields {
  return {
    fsrsState: word.fsrsState,
    stability: word.stability,
    difficulty: word.difficulty,
    dueAt: word.dueAt,
    scheduledDays: word.scheduledDays,
    learningSteps: word.learningSteps,
    reps: word.reps,
    lapses: word.lapses,
    lastReview: word.lastReview,
  };
}

export function prismaDataFromPatch(patch: FsrsWordPatch) {
  return {
    fsrsState: patch.fsrsState,
    stability: patch.stability,
    difficulty: patch.difficulty,
    dueAt: patch.dueAt,
    scheduledDays: patch.scheduledDays,
    learningSteps: patch.learningSteps,
    reps: patch.reps,
    lapses: patch.lapses,
    lastReview: patch.lastReview,
    confidence: patch.confidence,
    lastPractice: patch.lastPractice,
    updatedAt: new Date(),
  };
}

/** Idempotent: only rows with dueAt null. */
export async function ensureWordMigrated(word: WordFsrsRow): Promise<WordFsrsRow> {
  if (word.dueAt != null) return word;
  const patch = migrateLegacyWordToFsrs({
    wordId: word.id,
    confidence: word.confidence,
    lastPractice: word.lastPractice,
  });
  const updated = await prisma.word.update({
    where: { id: word.id },
    data: prismaDataFromPatch(patch),
    select: FSRS_WORD_SELECT,
  });
  return updated;
}

export async function migrateAllWordsWithNullDueAt(batchSize = 200) {
  let migrated = 0;
  for (;;) {
    const batch = await prisma.word.findMany({
      where: { dueAt: null },
      select: FSRS_WORD_SELECT,
      take: batchSize,
      orderBy: { id: "asc" },
    });
    if (batch.length === 0) break;
    for (const word of batch) {
      await ensureWordMigrated(word);
      migrated += 1;
    }
    if (batch.length < batchSize) break;
  }
  return migrated;
}

export type ProgressInput = {
  rating?: number | null;
  confidence?: number | null;
  reviewedAt?: string | Date | null;
  clientReviewId?: string | null;
};

export type ProgressResult = {
  wordId: number;
  confidence: number;
  fsrsState: number;
  stability: number | null;
  difficulty: number | null;
  dueAt: Date | null;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReview: Date | null;
  lastPractice: Date | null;
  duplicate?: boolean;
};

function progressResultFromWord(word: WordFsrsRow & { lastPractice: Date | null }, duplicate = false): ProgressResult {
  return {
    wordId: word.id,
    confidence: word.confidence,
    fsrsState: word.fsrsState,
    stability: word.stability,
    difficulty: word.difficulty,
    dueAt: word.dueAt,
    scheduledDays: word.scheduledDays,
    learningSteps: word.learningSteps,
    reps: word.reps,
    lapses: word.lapses,
    lastReview: word.lastReview,
    lastPractice: word.lastPractice,
    duplicate,
  };
}

export async function applyWordFsrsProgress(
  wordId: number,
  userId: number,
  input: ProgressInput
): Promise<ProgressResult> {
  const rating = resolveRating({ rating: input.rating, confidence: input.confidence });
  if (rating == null) {
    throw Object.assign(new Error("Rating inválido"), { statusCode: 400 });
  }

  const existing = await prisma.word.findUnique({
    where: { id: wordId, vault: { userId } },
    select: FSRS_WORD_SELECT,
  });
  if (!existing) {
    throw Object.assign(new Error("Palavra não encontrada ou não pertence ao usuário"), { statusCode: 404 });
  }

  if (input.clientReviewId) {
    const prior = await prisma.wordFsrsReviewLog.findUnique({
      where: { clientReviewId: input.clientReviewId },
      select: { wordId: true },
    });
    if (prior) {
      const current = await ensureWordMigrated(existing);
      return progressResultFromWord(current, true);
    }
  }

  const word = await ensureWordMigrated(existing);
  const now = new Date();
  const reviewedAtRaw = input.reviewedAt ? new Date(input.reviewedAt) : now;
  if (Number.isNaN(reviewedAtRaw.getTime())) {
    throw Object.assign(new Error("reviewedAt inválido"), { statusCode: 400 });
  }
  const clamped = clampReviewedAt(reviewedAtRaw, word.lastReview, now);
  if (!clamped.ok) {
    throw Object.assign(
      new Error(clamped.reason === "future" ? "reviewedAt no futuro" : "reviewedAt anterior ao lastReview"),
      { statusCode: 400 }
    );
  }

  const applied = applyFsrsRating(fieldsFromWord(word), rating, clamped.at);
  const patch = applied.patch;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (input.clientReviewId) {
        await tx.wordFsrsReviewLog.create({
          data: {
            wordId,
            clientReviewId: input.clientReviewId,
            rating: applied.rating,
            reviewedAt: clamped.at,
            state: Number(applied.log.state),
            stability: applied.log.stability,
            difficulty: applied.log.difficulty,
            dueAt: applied.log.due,
            scheduledDays: applied.log.scheduled_days,
            learningSteps: applied.log.learning_steps,
            source: "recall",
          },
        });
      } else {
        await tx.wordFsrsReviewLog.create({
          data: {
            wordId,
            rating: applied.rating,
            reviewedAt: clamped.at,
            state: Number(applied.log.state),
            stability: applied.log.stability,
            difficulty: applied.log.difficulty,
            dueAt: applied.log.due,
            scheduledDays: applied.log.scheduled_days,
            learningSteps: applied.log.learning_steps,
            source: "recall",
          },
        });
      }

      return tx.word.update({
        where: { id: wordId },
        data: prismaDataFromPatch(patch),
        select: FSRS_WORD_SELECT,
      });
    });

    if (patch.confidence !== word.confidence) {
      await recordWordLevel(wordId, patch.confidence);
    }

    return progressResultFromWord(updated);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "P2002" && input.clientReviewId) {
      const current = await prisma.word.findUniqueOrThrow({
        where: { id: wordId },
        select: FSRS_WORD_SELECT,
      });
      return progressResultFromWord(current, true);
    }
    throw error;
  }
}

export async function applyWordLearningPreset(
  wordId: number,
  userId: number,
  status: LearningStatusId
): Promise<ProgressResult> {
  const existing = await prisma.word.findUnique({
    where: { id: wordId, vault: { userId } },
    select: FSRS_WORD_SELECT,
  });
  if (!existing) {
    throw Object.assign(new Error("Palavra não encontrada ou não pertence ao usuário"), { statusCode: 404 });
  }
  const word = await ensureWordMigrated(existing);
  const now = new Date();
  const patch = applyLearningStatusPreset(status, fieldsFromWord(word), now);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.wordFsrsReviewLog.create({
      data: {
        wordId,
        rating: 0,
        reviewedAt: now,
        state: patch.fsrsState,
        stability: patch.stability ?? 0,
        difficulty: patch.difficulty ?? 0,
        dueAt: patch.dueAt ?? now,
        scheduledDays: patch.scheduledDays,
        learningSteps: patch.learningSteps,
        source: "preset",
      },
    });
    return tx.word.update({
      where: { id: wordId },
      data: prismaDataFromPatch(patch),
      select: FSRS_WORD_SELECT,
    });
  });

  if (patch.confidence !== word.confidence) {
    await recordWordLevel(wordId, patch.confidence);
  }

  return progressResultFromWord(updated);
}

export { patchFromCard };
