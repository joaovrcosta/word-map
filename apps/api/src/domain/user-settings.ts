import { isStudyGoalMinutes } from "@word-map/shared";
import { prisma } from "../prisma/client";
import { revalidatePath } from "../common/revalidate";
import { getCurrentUser } from "../auth/current-user";
import { ensureUserSettings, updateDailyGoalMinutes } from "./study";

export interface UserSettings {
  id: number;
  userId: number;
  useAllVaultsForLinks: boolean;
  autoTranslateWordPreview: boolean;
  dailyGoalMinutes: number;
  currentStreak: number;
  bestStreak: number;
  lastGoalDate: string | null;
  creditedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserSettingsUpdate = Partial<
  Pick<
    UserSettings,
    "useAllVaultsForLinks" | "autoTranslateWordPreview" | "dailyGoalMinutes"
  >
>;

export async function getUserSettings(): Promise<UserSettings | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    await ensureUserSettings(user.id);
    const rows = await prisma.$queryRaw<UserSettings[]>`
      SELECT
        id,
        "userId",
        "useAllVaultsForLinks",
        "autoTranslateWordPreview",
        "dailyGoalMinutes",
        "currentStreak",
        "bestStreak",
        "lastGoalDate",
        "creditedUntil",
        "createdAt",
        "updatedAt"
      FROM "UserSettings"
      WHERE "userId" = ${user.id}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error("Erro ao buscar configurações do usuário:", error);
    return null;
  }
}

export async function upsertUserSettings(
  updates: UserSettingsUpdate
): Promise<UserSettings> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Usuário não autenticado");

    await ensureUserSettings(user.id);

    if (updates.dailyGoalMinutes !== undefined) {
      const goal = Number(updates.dailyGoalMinutes);
      if (!isStudyGoalMinutes(goal)) {
        throw new Error("Meta diária inválida");
      }
      await updateDailyGoalMinutes(goal);
    }

    const { dailyGoalMinutes: _goal, ...rest } = updates;
    const hasFlags =
      rest.useAllVaultsForLinks !== undefined ||
      rest.autoTranslateWordPreview !== undefined;

    if (hasFlags) {
      await prisma.userSettings.update({
        where: { userId: user.id },
        data: rest,
      });
    }

    const settings = await getUserSettings();
    if (!settings) throw new Error("Configurações do usuário não encontradas");

    try {
      revalidatePath("/home/profile");
    } catch (revalidateError) {
      console.warn("Erro ao revalidar cache (não crítico):", revalidateError);
    }

    return settings;
  } catch (error) {
    console.error("Erro detalhado ao salvar configurações do usuário:", error);

    if (error instanceof Error) {
      if (error.message === "Meta diária inválida") throw error;
      if (error.message === "Usuário não autenticado") throw error;
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
