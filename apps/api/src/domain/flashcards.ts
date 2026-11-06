import { Prisma } from "@prisma/client";
import { isWordDue } from "@word-map/shared/flashcard-schedule";
import { prisma } from "../prisma/client";
import { revalidatePath } from "../common/revalidate";
import { getCurrentUser } from "../auth/current-user";
import { awardFlashcardPoints } from "../lib/points";
import {
  applyWordFsrsProgress,
  ensureWordMigrated,
  FSRS_WORD_SELECT,
  type ProgressInput,
  type ProgressResult,
} from "./word-fsrs";

export interface FlashcardWord {
  id: number;
  name: string;
  grammaticalClass: string;
  category: string | null;
  translations: string[];
  confidence: number;
  lastPractice?: Date | null;
  dueAt?: Date | null;
  fsrsState?: number | null;
  stability?: number | null;
  missedLast?: boolean;
  vaultId: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ChallengeKind = "listen" | "match" | "cloze" | "speak";

export interface FlashcardProgress {
  wordId: number;
  lastReviewed: Date | null;
  nextReview: Date | null;
  reviewCount: number;
  confidence: number;
  streak: number;
  easeFactor: number;
}

export interface FlashcardSession {
  id: string;
  vaultId: number;
  vaultName: string;
  totalWords: number;
  wordsToReview: number;
  newWords: number;
  completedWords: number;
  startTime: Date;
  endTime?: Date;
}

async function listFlashcardWords(vaultId?: number): Promise<FlashcardWord[]> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const words = await prisma.word.findMany({
      where: {
        ...(vaultId ? { vaultId } : {}),
        vault: {
          userId: user.id,
        },
      },
      select: {
        name: true,
        grammaticalClass: true,
        category: true,
        translations: true,
        vaultId: true,
        createdAt: true,
        updatedAt: true,
        ...FSRS_WORD_SELECT,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Lazy-migrate any rows still missing dueAt (idempotent).
    const migrated = await Promise.all(
      words.map(async (word) => {
        if (word.dueAt != null) return word;
        const next = await ensureWordMigrated(word);
        return { ...word, ...next };
      })
    );

    const ids = migrated.map((word) => word.id);
    const missed = new Set<number>();
    if (ids.length > 0) {
      const latest = await prisma.$queryRaw<Array<{ wordId: number; correct: boolean }>>`
        SELECT DISTINCT ON (r."wordId") r."wordId" AS "wordId", r.correct
        FROM "WordReview" r
        WHERE r."wordId" IN (${Prisma.join(ids)})
        ORDER BY r."wordId", r."createdAt" DESC
      `;
      for (const row of latest) {
        if (!row.correct) missed.add(row.wordId);
      }
    }

    return migrated.map((word) => ({
      id: word.id,
      name: word.name,
      grammaticalClass: word.grammaticalClass,
      category: word.category,
      translations: word.translations,
      confidence: word.confidence,
      lastPractice: word.lastPractice,
      dueAt: word.dueAt,
      fsrsState: word.fsrsState,
      stability: word.stability,
      vaultId: word.vaultId,
      createdAt: word.createdAt,
      updatedAt: word.updatedAt,
      missedLast: missed.has(word.id),
    }));
  } catch (error) {
    console.error("Erro ao buscar palavras para flashcards:", error);
    throw new Error("Erro ao buscar palavras para flashcards");
  }
}

export function getFlashcardWords(vaultId: number): Promise<FlashcardWord[]> {
  return listFlashcardWords(vaultId);
}

export function getAllFlashcardWords(): Promise<FlashcardWord[]> {
  return listFlashcardWords();
}

export async function getVaultForFlashcards(vaultId: number) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const vault = await prisma.vault.findUnique({
      where: {
        id: vaultId,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        words: {
          where: { isSaved: true },
          select: { id: true },
        },
      },
    });

    if (!vault) {
      throw new Error("Vault não encontrado ou não pertence ao usuário");
    }

    return {
      id: vault.id,
      name: vault.name,
      totalWords: vault.words.length,
    };
  } catch (error) {
    console.error("Erro ao buscar vault para flashcards:", error);
    throw new Error("Erro ao buscar vault para flashcards");
  }
}

/** FSRS rating path. `confidence` is legacy alias for rating when `rating` is absent. */
export async function updateWordProgress(
  wordId: number,
  input: ProgressInput
): Promise<ProgressResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const result = await applyWordFsrsProgress(wordId, user.id, input);
    revalidatePath("/home/flashcards");
    return result;
  } catch (error) {
    console.error("Erro ao atualizar progresso da palavra:", error);
    throw error;
  }
}

/**
 * Challenge outcomes: points + WordReview only.
 * Does NOT apply FSRS or change confidence/card (avoids same-day inflation).
 */
export async function recordChallengeResult(
  wordId: number,
  correct: boolean,
  challenge: ChallengeKind,
  streak = 1
): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const existingWord = await prisma.word.findUnique({
      where: {
        id: wordId,
        vault: {
          userId: user.id,
        },
      },
      select: { id: true },
    });

    if (!existingWord) {
      throw new Error("Palavra não encontrada ou não pertence ao usuário");
    }

    const review = await prisma.wordReview.create({
      data: {
        wordId,
        correct,
        challenge,
      },
    });
    if (correct) {
      await awardFlashcardPoints(user.id, wordId, review.id, streak);
    }

    revalidatePath("/home/flashcards");
  } catch (error) {
    console.error("Erro ao registrar desafio:", error);
    throw new Error("Erro ao registrar desafio");
  }
}

export async function createFlashcardSession(vaultId: number): Promise<FlashcardSession> {
  try {
    const vault = await getVaultForFlashcards(vaultId);
    const words = await getFlashcardWords(vaultId);

    const session: FlashcardSession = {
      id: `session_${Date.now()}_${vaultId}`,
      vaultId: vault.id,
      vaultName: vault.name,
      totalWords: vault.totalWords,
      wordsToReview: words.length,
      newWords: words.filter((w) => !w.lastPractice && (w.fsrsState ?? 0) === 0).length,
      completedWords: 0,
      startTime: new Date(),
    };

    return session;
  } catch (error) {
    console.error("Erro ao criar sessão de flashcards:", error);
    throw new Error("Erro ao criar sessão de flashcards");
  }
}

export async function calculateNextReview(
  currentConfidence: number,
  reviewCount: number,
  easeFactor: number = 2.5
): Promise<Date> {
  void reviewCount;
  void easeFactor;
  // Legacy endpoint: approximate with a short due from an empty-ish schedule.
  const now = new Date();
  const days = currentConfidence >= 4 ? 21 : currentConfidence >= 3 ? 7 : currentConfidence >= 2 ? 3 : 1;
  return new Date(now.getTime() + days * 86_400_000);
}

export async function filterWordsForReview(words: FlashcardWord[]): Promise<FlashcardWord[]> {
  return words.filter((word) => isWordDue(word));
}
