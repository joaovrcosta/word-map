import {
  getUserSettings,
  upsertUserSettings,
  getUserStats,
  type UserSettings,
} from "../user-settings";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "../auth";
import { revalidatePath } from "next/cache";

// Mock das dependências
jest.mock("@/lib/prisma", () => ({
  prisma: {
    userSettings: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    word: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    vault: {
      count: jest.fn(),
    },
    wordHistory: {
      count: jest.fn(),
    },
  },
}));

jest.mock("../auth", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<
  typeof revalidatePath
>;

describe("User Settings Actions", () => {
  const mockUser = {
    id: 1,
    name: "João Silva",
    email: "joao@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(mockUser);
  });

  describe("getUserSettings", () => {
    it("deve buscar configurações do usuário com sucesso", async () => {
      const mockSettings: UserSettings = {
        id: 1,
        userId: 1,
        useAllVaultsForLinks: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.userSettings.findUnique.mockResolvedValue(mockSettings);

      const result = await getUserSettings();

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.userSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(result).toEqual(mockSettings);
    });

    it("deve retornar null se usuário não estiver autenticado", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      const result = await getUserSettings();

      expect(result).toBeNull();
    });

    it("deve retornar null se configurações não existirem", async () => {
      mockPrisma.userSettings.findUnique.mockResolvedValue(null);

      const result = await getUserSettings();

      expect(result).toBeNull();
    });

    it("deve retornar null em caso de erro", async () => {
      mockPrisma.userSettings.findUnique.mockRejectedValue(
        new Error("Database error")
      );

      const result = await getUserSettings();

      expect(result).toBeNull();
    });
  });

  describe("upsertUserSettings", () => {
    it("deve criar novas configurações se não existirem", async () => {
      const mockSettings: UserSettings = {
        id: 1,
        userId: 1,
        useAllVaultsForLinks: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.userSettings.findUnique.mockResolvedValue(null);
      mockPrisma.userSettings.create.mockResolvedValue(mockSettings);

      const result = await upsertUserSettings(true);

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.userSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(mockPrisma.userSettings.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          useAllVaultsForLinks: true,
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home/profile");
      expect(result).toEqual(mockSettings);
    });

    it("deve atualizar configurações existentes", async () => {
      const existingSettings: UserSettings = {
        id: 1,
        userId: 1,
        useAllVaultsForLinks: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedSettings: UserSettings = {
        ...existingSettings,
        useAllVaultsForLinks: true,
        updatedAt: new Date(),
      };

      mockPrisma.userSettings.findUnique.mockResolvedValue(existingSettings);
      mockPrisma.userSettings.update.mockResolvedValue(updatedSettings);

      const result = await upsertUserSettings(true);

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.userSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(mockPrisma.userSettings.update).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { useAllVaultsForLinks: true },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home/profile");
      expect(result).toEqual(updatedSettings);
    });

    it("deve falhar se usuário não estiver autenticado", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(upsertUserSettings(true)).rejects.toThrow(
        "Usuário não autenticado"
      );
    });

    it("deve tratar erro de constraint única", async () => {
      const error = new Error("Unique constraint failed");
      error.message = "Unique constraint failed";

      mockPrisma.userSettings.findUnique.mockResolvedValue(null);
      mockPrisma.userSettings.create.mockRejectedValue(error);

      await expect(upsertUserSettings(true)).rejects.toThrow(
        "Configurações já existem para este usuário"
      );
    });

    it("deve tratar erro de foreign key constraint", async () => {
      const error = new Error("Foreign key constraint failed");
      error.message = "Foreign key constraint failed";

      mockPrisma.userSettings.findUnique.mockResolvedValue(null);
      mockPrisma.userSettings.create.mockRejectedValue(error);

      await expect(upsertUserSettings(true)).rejects.toThrow(
        "Usuário não encontrado"
      );
    });

    it("deve tratar erro de conexão", async () => {
      const error = new Error("Connection failed");
      error.message = "Connection failed";

      mockPrisma.userSettings.findUnique.mockResolvedValue(null);
      mockPrisma.userSettings.create.mockRejectedValue(error);

      await expect(upsertUserSettings(true)).rejects.toThrow(
        "Erro de conexão com o banco de dados"
      );
    });

    it("deve tratar erro genérico", async () => {
      const error = new Error("Generic error");

      mockPrisma.userSettings.findUnique.mockResolvedValue(null);
      mockPrisma.userSettings.create.mockRejectedValue(error);

      await expect(upsertUserSettings(true)).rejects.toThrow(
        "Erro ao salvar configurações: Generic error"
      );
    });
  });

  describe("getUserStats", () => {
    it("deve buscar estatísticas do usuário com sucesso", async () => {
      const mockStats = {
        totalWords: 50,
        totalVaults: 3,
        wordsByConfidence: [
          { confidence: 1, _count: { confidence: 10 } },
          { confidence: 2, _count: { confidence: 15 } },
          { confidence: 3, _count: { confidence: 20 } },
          { confidence: 4, _count: { confidence: 5 } },
        ],
        wordsByCategory: [
          { category: "greeting", _count: { category: 10 } },
          { category: "food", _count: { category: 15 } },
        ],
        wordsByGrammaticalClass: [
          { grammaticalClass: "noun", _count: { grammaticalClass: 25 } },
          { grammaticalClass: "verb", _count: { grammaticalClass: 20 } },
        ],
        recentActivity: 12,
        totalConnections: 8,
      };

      // Mock das chamadas do Promise.all
      mockPrisma.word.count
        .mockResolvedValueOnce(50) // totalWords
        .mockResolvedValueOnce(8); // totalConnections
      mockPrisma.vault.count.mockResolvedValue(3); // totalVaults
      mockPrisma.word.groupBy
        .mockResolvedValueOnce(mockStats.wordsByConfidence) // wordsByConfidence
        .mockResolvedValueOnce(mockStats.wordsByCategory) // wordsByCategory
        .mockResolvedValueOnce(mockStats.wordsByGrammaticalClass); // wordsByGrammaticalClass
      mockPrisma.wordHistory.count.mockResolvedValue(12); // recentActivity

      const result = await getUserStats();

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.word.count).toHaveBeenCalledWith({
        where: { vault: { userId: 1 } },
      });
      expect(mockPrisma.vault.count).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
      expect(mockPrisma.word.groupBy).toHaveBeenCalledWith({
        by: ["confidence"],
        where: { vault: { userId: 1 } },
        _count: { confidence: true },
      });
      expect(mockPrisma.word.groupBy).toHaveBeenCalledWith({
        by: ["category"],
        where: {
          vault: { userId: 1 },
          category: { not: null },
        },
        _count: { category: true },
      });
      expect(mockPrisma.word.groupBy).toHaveBeenCalledWith({
        by: ["grammaticalClass"],
        where: { vault: { userId: 1 } },
        _count: { grammaticalClass: true },
      });
      expect(mockPrisma.wordHistory.count).toHaveBeenCalledWith({
        where: {
          userId: 1,
          createdAt: {
            gte: expect.any(Date),
          },
        },
      });
      expect(mockPrisma.word.count).toHaveBeenCalledWith({
        where: {
          vault: { userId: 1 },
          OR: [{ Word_A: { some: {} } }, { Word_B: { some: {} } }],
        },
      });

      expect(result).toEqual({
        totalWords: 50,
        totalVaults: 3,
        wordsByConfidence: [
          { confidence: 1, count: 10 },
          { confidence: 2, count: 15 },
          { confidence: 3, count: 20 },
          { confidence: 4, count: 5 },
        ],
        wordsByCategory: [
          { category: "greeting", count: 10 },
          { category: "food", count: 15 },
        ],
        wordsByGrammaticalClass: [
          { grammaticalClass: "noun", count: 25 },
          { grammaticalClass: "verb", count: 20 },
        ],
        recentActivity: 12,
        totalConnections: 8,
      });
    });

    it("deve falhar se usuário não estiver autenticado", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(getUserStats()).rejects.toThrow(
        "Erro ao buscar estatísticas do usuário"
      );
    });

    it("deve falhar em caso de erro", async () => {
      mockPrisma.word.count.mockRejectedValue(new Error("Database error"));

      await expect(getUserStats()).rejects.toThrow(
        "Erro ao buscar estatísticas do usuário"
      );
    });
  });
});
