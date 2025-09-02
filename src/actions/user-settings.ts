"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth";

export interface UserSettings {
  id: number;
  userId: number;
  useAllVaultsForLinks: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Buscar configurações do usuário
export async function getUserSettings(): Promise<UserSettings | null> {
  try {
    // Verificar se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
      console.log("Usuário não autenticado ao buscar configurações");
      return null;
    }

    console.log("Buscando configurações para usuário:", user.id);
    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    console.log("Configurações encontradas:", settings);
    return settings;
  } catch (error) {
    console.error("Erro ao buscar configurações do usuário:", error);
    return null;
  }
}

// Criar ou atualizar configurações do usuário
export async function upsertUserSettings(
  useAllVaultsForLinks: boolean
): Promise<UserSettings> {
  try {
    console.log("Iniciando upsert de configurações do usuário...");

    // Verificar se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
      console.log("Usuário não autenticado ao salvar configurações");
      throw new Error("Usuário não autenticado");
    }

    console.log("Usuário autenticado:", { id: user.id, name: user.name });

    // Verificar se já existem configurações
    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    console.log("Configurações existentes:", existingSettings);

    let settings: UserSettings;

    if (existingSettings) {
      console.log("Atualizando configurações existentes...");
      settings = await prisma.userSettings.update({
        where: { userId: user.id },
        data: { useAllVaultsForLinks },
      });
    } else {
      console.log("Criando novas configurações...");
      settings = await prisma.userSettings.create({
        data: {
          userId: user.id,
          useAllVaultsForLinks,
        },
      });
    }

    console.log("Configurações salvas com sucesso:", settings);

    // Revalidar cache da página de perfil
    try {
      revalidatePath("/home/profile");
      console.log("Cache da página de perfil revalidado");
    } catch (revalidateError) {
      console.warn("Erro ao revalidar cache (não crítico):", revalidateError);
    }

    return settings;
  } catch (error) {
    console.error("Erro detalhado ao salvar configurações do usuário:", error);

    // Verificar se é um erro específico do Prisma
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        throw new Error("Configurações já existem para este usuário");
      }
      if (error.message.includes("Foreign key constraint")) {
        throw new Error("Usuário não encontrado");
      }
      if (error.message.includes("Connection")) {
        throw new Error("Erro de conexão com o banco de dados");
      }
    }

    throw new Error(
      `Erro ao salvar configurações: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Buscar estatísticas do usuário
export async function getUserStats() {
  try {
    // Verificar se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
      console.log("Usuário não autenticado ao buscar estatísticas");
      throw new Error("Usuário não autenticado");
    }

    console.log("Buscando estatísticas para usuário:", user.id);
    const userId = user.id;
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
