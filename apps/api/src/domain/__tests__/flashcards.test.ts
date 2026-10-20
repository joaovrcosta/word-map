import {
  getFlashcardWords,
  getVaultForFlashcards,
  updateWordProgress,
  recordChallengeResult,
  createFlashcardSession,
  calculateNextReview,
  filterWordsForReview,
  type FlashcardWord,
  type FlashcardSession,
} from "../flashcards";
import { prisma } from "../../prisma/client";
import { getCurrentUser } from "../../auth/current-user";
import { revalidatePath } from "../../common/revalidate";

// Mock das dependências
jest.mock("../../prisma/client", () => ({
  prisma: {
    word: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    wordReview: {
      create: jest.fn(),
    },
    $executeRaw: jest.fn().mockResolvedValue(1),
    vault: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("../../auth/current-user", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("../../common/revalidate", () => ({
  revalidatePath: jest.fn(),
}));

// Não vamos mockar o próprio arquivo, vamos usar spies quando necessário

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<
  typeof revalidatePath
>;
// Vamos usar spies quando necessário

describe("Flashcards Actions", () => {
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

  describe("getFlashcardWords", () => {
    it("deve buscar palavras para flashcards com sucesso", async () => {
      const mockWords: FlashcardWord[] = [
        {
          id: 1,
          name: "hello",
          grammaticalClass: "interjection",
          category: "greeting",
          translations: ["olá", "oi"],
          confidence: 3,
          vaultId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: "goodbye",
          grammaticalClass: "interjection",
          category: "greeting",
          translations: ["tchau", "até logo"],
          confidence: 2,
          vaultId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.word.findMany.mockResolvedValue(mockWords);

      const result = await getFlashcardWords(1);

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.word.findMany).toHaveBeenCalledWith({
        where: {
          vaultId: 1,
          vault: {
            userId: 1,
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
          createdAt: "asc",
        },
      });
      expect(result).toEqual(mockWords);
    });

    it("deve falhar se usuário não estiver autenticado", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(getFlashcardWords(1)).rejects.toThrow(
        "Erro ao buscar palavras para flashcards"
      );
    });
  });

  describe("getVaultForFlashcards", () => {
    it("deve buscar informações do vault para flashcards com sucesso", async () => {
      const mockVault = {
        id: 1,
        name: "Vault 1",
        words: [{ id: 1 }, { id: 2 }, { id: 3 }],
      };

      mockPrisma.vault.findUnique.mockResolvedValue(mockVault);

      const result = await getVaultForFlashcards(1);

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.vault.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
          userId: 1,
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
      expect(result).toEqual({
        id: 1,
        name: "Vault 1",
        totalWords: 3,
      });
    });

    it("deve falhar se vault não for encontrado", async () => {
      mockPrisma.vault.findUnique.mockResolvedValue(null);

      await expect(getVaultForFlashcards(999)).rejects.toThrow(
        "Erro ao buscar vault para flashcards"
      );
    });

    it("deve falhar se usuário não estiver autenticado", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(getVaultForFlashcards(1)).rejects.toThrow(
        "Erro ao buscar vault para flashcards"
      );
    });
  });

  describe("updateWordProgress", () => {
    it("deve atualizar progresso da palavra com sucesso", async () => {
      const mockWord = {
        id: 1,
        name: "hello",
        grammaticalClass: "interjection",
        category: "greeting",
        translations: ["olá", "oi"],
        confidence: 2,
        isSaved: true,
        vaultId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedWord = {
        ...mockWord,
        confidence: 4,
        updatedAt: new Date(),
      };

      mockPrisma.word.findUnique.mockResolvedValue(mockWord);
      mockPrisma.word.update.mockResolvedValue(mockUpdatedWord);

      await updateWordProgress(1, 4, 5);

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.word.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
          vault: {
            userId: 1,
          },
        },
      });
      expect(mockPrisma.word.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          confidence: 4,
          lastPractice: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home/flashcards");
    });

    it("deve falhar se palavra não for encontrada", async () => {
      mockPrisma.word.findUnique.mockResolvedValue(null);

      await expect(updateWordProgress(999, 4, 5)).rejects.toThrow(
        "Erro ao atualizar progresso da palavra"
      );
    });

    it("deve falhar se usuário não estiver autenticado", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(updateWordProgress(1, 4, 5)).rejects.toThrow(
        "Erro ao atualizar progresso da palavra"
      );
    });
  });

  describe("createFlashcardSession", () => {
    it("deve criar sessão de flashcards com sucesso", async () => {
      const mockVault = {
        id: 1,
        name: "Vault 1",
        words: [{ id: 1 }, { id: 2 }, { id: 3 }],
      };

      const mockWords: FlashcardWord[] = [
        {
          id: 1,
          name: "hello",
          grammaticalClass: "interjection",
          category: "greeting",
          translations: ["olá", "oi"],
          confidence: 1, // Nova palavra
          vaultId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: "goodbye",
          grammaticalClass: "interjection",
          category: "greeting",
          translations: ["tchau", "até logo"],
          confidence: 3, // Palavra conhecida
          vaultId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          name: "thanks",
          grammaticalClass: "interjection",
          category: "greeting",
          translations: ["obrigado", "valeu"],
          confidence: 2, // Palavra com dificuldade
          vaultId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock das funções que são chamadas internamente
      mockPrisma.vault.findUnique.mockResolvedValue(mockVault);
      mockPrisma.word.findMany.mockResolvedValue(mockWords);

      const result = await createFlashcardSession(1);

      expect(result).toEqual({
        id: expect.stringMatching(/^session_\d+_1$/),
        vaultId: 1,
        vaultName: "Vault 1",
        totalWords: 3,
        wordsToReview: 3,
        newWords: 1, // Apenas a palavra com confidence 1
        completedWords: 0,
        startTime: expect.any(Date),
      });
    });
  });

  describe("calculateNextReview", () => {
    it("deve calcular próximo review para palavra bem conhecida", async () => {
      const now = new Date();
      const result = await calculateNextReview(4, 3, 2.5);

      const expectedDate = new Date(now);
      expectedDate.setDate(now.getDate() + Math.max(1, Math.floor(2.5 * 3)));

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedDate.getTime());
    });

    it("deve calcular próximo review para palavra conhecida", async () => {
      const now = new Date();
      const result = await calculateNextReview(3, 2, 2.5);

      const expectedDate = new Date(now);
      expectedDate.setDate(
        now.getDate() + Math.max(1, Math.floor(2.5 * 2 * 0.7))
      );

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedDate.getTime());
    });

    it("deve calcular próximo review para palavra com dificuldade", async () => {
      const now = new Date();
      const result = await calculateNextReview(2, 1, 2.5);

      const expectedDate = new Date(now);
      expectedDate.setDate(
        now.getDate() + Math.max(1, Math.floor(2.5 * 1 * 0.5))
      );

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedDate.getTime());
    });

    it("deve calcular próximo review para palavra difícil", async () => {
      const now = new Date();
      const result = await calculateNextReview(1, 0, 2.5);

      const expectedDate = new Date(now);
      expectedDate.setDate(now.getDate() + 1);

      expect(result.getTime()).toBeGreaterThanOrEqual(expectedDate.getTime());
    });
  });

  describe("filterWordsForReview", () => {
    const baseWord = {
      name: "hello",
      grammaticalClass: "interjection",
      category: "greeting",
      translations: ["olá"],
      vaultId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("deve incluir palavra nova e palavra nunca praticada", async () => {
      const mockWords: FlashcardWord[] = [
        { ...baseWord, id: 1, confidence: 1, lastPractice: new Date() },
        { ...baseWord, id: 2, name: "goodbye", confidence: 3 },
      ];

      const result = await filterWordsForReview(mockWords);

      expect(result.map((word) => word.id)).toEqual([1, 2]);
    });

    it("deve deixar de fora palavra fácil praticada há pouco", async () => {
      const recent = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const due = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      const mockWords: FlashcardWord[] = [
        { ...baseWord, id: 1, confidence: 4, lastPractice: recent },
        {
          ...baseWord,
          id: 2,
          name: "goodbye",
          confidence: 4,
          lastPractice: due,
        },
      ];

      const result = await filterWordsForReview(mockWords);

      expect(result.map((word) => word.id)).toEqual([2]);
    });

    it("deve retornar array vazio se não houver palavras", async () => {
      const result = await filterWordsForReview([]);

      expect(result).toEqual([]);
    });
  });

  describe("recordChallengeResult", () => {
    it("deve subir a confiança quando o desafio está certo", async () => {
      mockPrisma.word.findUnique.mockResolvedValue({
        id: 1,
        confidence: 2,
      });
      mockPrisma.word.update.mockResolvedValue({});
      mockPrisma.wordReview.create.mockResolvedValue({});

      await recordChallengeResult(1, true, "listen");

      expect(mockPrisma.word.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          confidence: 3,
          lastPractice: expect.any(Date),
        },
      });
      expect(mockPrisma.wordReview.create).toHaveBeenCalledWith({
        data: {
          wordId: 1,
          correct: true,
          challenge: "listen",
        },
      });
    });

    it("mantém a confiança entre 1 e 4 no completar", async () => {
      mockPrisma.word.findUnique.mockResolvedValue({
        id: 1,
        confidence: 4,
      });
      mockPrisma.word.update.mockResolvedValue({});
      mockPrisma.wordReview.create.mockResolvedValue({});

      await recordChallengeResult(1, true, "cloze");

      expect(mockPrisma.word.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          confidence: 4,
          lastPractice: expect.any(Date),
        },
      });

      mockPrisma.word.findUnique.mockResolvedValue({
        id: 1,
        confidence: 1,
      });

      await recordChallengeResult(1, false, "cloze");

      expect(mockPrisma.word.update).toHaveBeenLastCalledWith({
        where: { id: 1 },
        data: {
          confidence: 1,
          lastPractice: expect.any(Date),
        },
      });
      expect(mockPrisma.wordReview.create).toHaveBeenCalledWith({
        data: {
          wordId: 1,
          correct: false,
          challenge: "cloze",
        },
      });
    });

    it("deve descer a confiança quando o desafio está errado", async () => {
      mockPrisma.word.findUnique.mockResolvedValue({
        id: 1,
        confidence: 1,
      });
      mockPrisma.word.update.mockResolvedValue({});
      mockPrisma.wordReview.create.mockResolvedValue({});

      await recordChallengeResult(1, false, "match");

      expect(mockPrisma.word.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          confidence: 1,
          lastPractice: expect.any(Date),
        },
      });
    });
  });
});
