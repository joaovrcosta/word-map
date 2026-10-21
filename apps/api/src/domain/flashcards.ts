
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { isWordDue, reviewIntervalDays } from "@word-map/shared/flashcard-schedule";
import { revalidatePath } from "../common/revalidate";
import { getCurrentUser } from "../auth/current-user";
import { awardFlashcardPoints } from "../lib/points";
import { recordWordLevel } from "./word-levels";

export interface FlashcardWord {
  id: number;
  name: string;
  grammaticalClass: string;
  category: string | null;
  translations: string[];
  confidence: number;
  lastPractice?: Date | null;
  missedLast?: boolean;
  vaultId: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ChallengeKind = "listen" | "match" | "cloze";

export interface FlashcardProgress {
  wordId: number;
  lastReviewed: Date | null;
  nextReview: Date | null;
  reviewCount: number;
  confidence: number; // 1-4
  streak: number;
  easeFactor: number; // Fator de facilidade para repetição espaçada
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
        id: true,
        name: true,
        grammaticalClass: true,
        category: true,
        translations: true,
        confidence: true,
        lastPractice: true,
        vaultId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "asc", // Palavras mais antigas primeiro para revisão
      },
    });

    const ids = words.map((word) => word.id);
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

    return words.map((word) => ({ ...word, missedLast: missed.has(word.id) }));
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

// Buscar informações do vault para flashcards
export async function getVaultForFlashcards(vaultId: number) {
  try {
    // Verificar se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    const vault = await prisma.vault.findUnique({
      where: {
        id: vaultId,
        userId: user.id, // Verificar se o vault pertence ao usuário atual
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

// Atualizar progresso de uma palavra (simulado - em produção seria uma tabela separada)
export async function updateWordProgress(
  wordId: number,
  confidence: number,
  reviewCount: number
): Promise<void> {
  try {
    // Verificar se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Verificar se a palavra existe e pertence ao usuário
    const existingWord = await prisma.word.findUnique({
      where: {
        id: wordId,
        vault: {
          userId: user.id, // Verificar se a palavra pertence ao usuário atual
        },
      },
    });

    if (!existingWord) {
      throw new Error("Palavra não encontrada ou não pertence ao usuário");
    }

    // Em produção, isso seria uma tabela separada de progresso
    // Por enquanto, vamos apenas atualizar a confiança da palavra
    await prisma.word.update({
      where: { id: wordId },
      data: {
        confidence: confidence,
        lastPractice: new Date(),
        updatedAt: new Date(),
      },
    });
    if (confidence !== existingWord.confidence) {
      await recordWordLevel(wordId, confidence);
    }

    revalidatePath("/home/flashcards");
  } catch (error) {
    console.error("Erro ao atualizar progresso da palavra:", error);
    throw new Error("Erro ao atualizar progresso da palavra");
  }
}

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
    });

    if (!existingWord) {
      throw new Error("Palavra não encontrada ou não pertence ao usuário");
    }

    const nextConfidence = correct
      ? Math.min(4, existingWord.confidence + 1)
      : Math.max(1, existingWord.confidence - 1);

    await prisma.word.update({
      where: { id: wordId },
      data: {
        confidence: nextConfidence,
        lastPractice: new Date(),
      },
    });

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
    if (nextConfidence !== existingWord.confidence) {
      await recordWordLevel(wordId, nextConfidence);
    }

    revalidatePath("/home/flashcards");
  } catch (error) {
    console.error("Erro ao registrar desafio:", error);
    throw new Error("Erro ao registrar desafio");
  }
}

// Gerar sessão de flashcards
export async function createFlashcardSession(
  vaultId: number
): Promise<FlashcardSession> {
  try {
    const vault = await getVaultForFlashcards(vaultId);
    const words = await getFlashcardWords(vaultId);

    const session: FlashcardSession = {
      id: `session_${Date.now()}_${vaultId}`,
      vaultId: vault.id,
      vaultName: vault.name,
      totalWords: vault.totalWords,
      wordsToReview: words.length,
      newWords: words.filter((w) => w.confidence === 1).length,
      completedWords: 0,
      startTime: new Date(),
    };

    return session;
  } catch (error) {
    console.error("Erro ao criar sessão de flashcards:", error);
    throw new Error("Erro ao criar sessão de flashcards");
  }
}

// Calcular próximo review baseado no algoritmo de repetição espaçada
export async function calculateNextReview(
  currentConfidence: number,
  reviewCount: number,
  easeFactor: number = 2.5
): Promise<Date> {
  const now = new Date();
  const interval = reviewIntervalDays(currentConfidence);
  void reviewCount;
  void easeFactor;

  const nextReview = new Date(now);
  nextReview.setDate(now.getDate() + interval);

  return nextReview;
}

// Filtrar palavras para revisão baseado no algoritmo de repetição espaçada
export async function filterWordsForReview(
  words: FlashcardWord[]
): Promise<FlashcardWord[]> {
  return words.filter((word) => isWordDue(word));
}
