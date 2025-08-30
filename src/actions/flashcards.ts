"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface FlashcardWord {
  id: number;
  name: string;
  grammaticalClass: string;
  category: string | null;
  translations: string[];
  confidence: number;
  vaultId: number;
  createdAt: Date;
  updatedAt: Date;
}

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

// Buscar palavras de um vault específico para flashcards
export async function getFlashcardWords(
  vaultId: number
): Promise<FlashcardWord[]> {
  try {
    const words = await prisma.word.findMany({
      where: {
        vaultId: vaultId,
        isSaved: true,
      },
      select: {
        id: true,
        name: true,
        grammaticalClass: true,
        category: true,
        translations: true,
        confidence: true,
        vaultId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "asc", // Palavras mais antigas primeiro para revisão
      },
    });

    return words;
  } catch (error) {
    console.error("Erro ao buscar palavras para flashcards:", error);
    throw new Error("Erro ao buscar palavras para flashcards");
  }
}

// Buscar informações do vault para flashcards
export async function getVaultForFlashcards(vaultId: number) {
  try {
    const vault = await prisma.vault.findUnique({
      where: { id: vaultId },
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
      throw new Error("Vault não encontrado");
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
    // Em produção, isso seria uma tabela separada de progresso
    // Por enquanto, vamos apenas atualizar a confiança da palavra
    await prisma.word.update({
      where: { id: wordId },
      data: {
        confidence: confidence,
        updatedAt: new Date(),
      },
    });

    revalidatePath("/home/flashcards");
  } catch (error) {
    console.error("Erro ao atualizar progresso da palavra:", error);
    throw new Error("Erro ao atualizar progresso da palavra");
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
  let interval: number;

  if (currentConfidence >= 4) {
    // Palavra bem conhecida - intervalo maior
    interval = Math.max(1, Math.floor(easeFactor * reviewCount));
  } else if (currentConfidence >= 3) {
    // Palavra conhecida - intervalo médio
    interval = Math.max(1, Math.floor(easeFactor * reviewCount * 0.7));
  } else if (currentConfidence >= 2) {
    // Palavra com dificuldade - intervalo menor
    interval = Math.max(1, Math.floor(easeFactor * reviewCount * 0.5));
  } else {
    // Palavra difícil - revisar em breve
    interval = 1;
  }

  const nextReview = new Date(now);
  nextReview.setDate(now.getDate() + interval);

  return nextReview;
}

// Filtrar palavras para revisão baseado no algoritmo de repetição espaçada
export async function filterWordsForReview(
  words: FlashcardWord[]
): Promise<FlashcardWord[]> {
  // Por enquanto, retornar todas as palavras
  // Depois implementaremos o filtro de repetição espaçada
  return words;
}
