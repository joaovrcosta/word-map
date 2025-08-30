"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface UserSettings {
  id: number;
  userId: number;
  useAllVaultsForLinks: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Buscar configurações do usuário
export async function getUserSettings(
  userId: number
): Promise<UserSettings | null> {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    return settings;
  } catch (error) {
    console.error("Erro ao buscar configurações do usuário:", error);
    throw new Error("Erro ao buscar configurações do usuário");
  }
}

// Criar ou atualizar configurações do usuário
export async function upsertUserSettings(
  userId: number,
  useAllVaultsForLinks: boolean
): Promise<UserSettings> {
  try {
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: { useAllVaultsForLinks },
      create: {
        userId,
        useAllVaultsForLinks,
      },
    });

    revalidatePath("/home/profile");
    return settings;
  } catch (error) {
    console.error("Erro ao salvar configurações do usuário:", error);
    throw new Error("Erro ao salvar configurações do usuário");
  }
}

// Buscar estatísticas do usuário
export async function getUserStats(userId: number) {
  try {
    const [
      totalWords,
      totalVaults,
      wordsByConfidence,
      wordsByCategory,
      wordsByGrammaticalClass,
      recentActivity,
      totalConnections,
    ] = await Promise.all([
      // Total de palavras
      prisma.word.count({
        where: { vault: { userId } },
      }),

      // Total de vaults
      prisma.vault.count({
        where: { userId },
      }),

      // Palavras por nível de confiança
      prisma.word.groupBy({
        by: ["confidence"],
        where: { vault: { userId } },
        _count: { confidence: true },
      }),

      // Palavras por categoria
      prisma.word.groupBy({
        by: ["category"],
        where: {
          vault: { userId },
          category: { not: null },
        },
        _count: { category: true },
      }),

      // Palavras por classe gramatical
      prisma.word.groupBy({
        by: ["grammaticalClass"],
        where: { vault: { userId } },
        _count: { grammaticalClass: true },
      }),

      // Atividade recente (últimos 30 dias)
      prisma.wordHistory.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Total de conexões entre palavras
      prisma.word.count({
        where: {
          vault: { userId },
          OR: [{ Word_A: { some: {} } }, { Word_B: { some: {} } }],
        },
      }),
    ]);

    return {
      totalWords,
      totalVaults,
      wordsByConfidence: wordsByConfidence.map((item) => ({
        confidence: item.confidence,
        count: item._count.confidence,
      })),
      wordsByCategory: wordsByCategory.map((item) => ({
        category: item.category!,
        count: item._count.category,
      })),
      wordsByGrammaticalClass: wordsByGrammaticalClass.map((item) => ({
        grammaticalClass: item.grammaticalClass,
        count: item._count.grammaticalClass,
      })),
      recentActivity,
      totalConnections,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas do usuário:", error);
    throw new Error("Erro ao buscar estatísticas do usuário");
  }
}
