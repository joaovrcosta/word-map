import {
  getVaults,
  createVault,
  deleteVault,
  createWord,
  searchWordInVaults,
  wordExistsInVault,
  moveWordToVault,
  unsaveWord,
  deleteWord,
  removeWordFromVault,
  updateWord,
  linkWords,
  unlinkWords,
  getRelatedWords,
  getLinkableWords,
  getAllWordRelations,
  createText,
  getUserTexts,
  updateText,
  deleteText,
  checkTextWords,
  updateVaultName,
  exportVaultWords,
  importWordsToVault,
  type Vault,
  type Word,
  type CreateWordData,
  type SearchResult,
  type Text,
} from "../actions";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "../auth";
import { revalidatePath } from "next/cache";

// Mock das dependências
jest.mock("@/lib/prisma", () => ({
  prisma: {
    vault: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    word: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    text: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("../auth", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/translate", () => ({
  translateDefinitions: jest.fn(),
}));

const mockTranslateDefinitions =
  require("@/lib/translate").translateDefinitions;

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<
  typeof getCurrentUser
>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<
  typeof revalidatePath
>;

describe("Actions", () => {
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

  describe("getVaults", () => {
    it("deve buscar vaults do usuário com sucesso", async () => {
      const mockVaults = [
        {
          id: 1,
          name: "Vault 1",
          userId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          words: [],
        },
        {
          id: 2,
          name: "Vault 2",
          userId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          words: [],
        },
      ];

      mockPrisma.vault.findMany.mockResolvedValue(mockVaults);

      const result = await getVaults();

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.vault.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: {
          words: {
            select: {
              id: true,
              name: true,
              grammaticalClass: true,
              category: true,
              translations: true,
              confidence: true,
              isSaved: true,
              vaultId: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(mockVaults);
    });

    it("deve falhar se usuário não estiver autenticado", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(getVaults()).rejects.toThrow("Erro ao buscar vaults");
    });
  });

  describe("createVault", () => {
    it("deve criar vault com sucesso", async () => {
      const mockVault = {
        id: 1,
        name: "Novo Vault",
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        words: [],
      };

      mockPrisma.vault.create.mockResolvedValue(mockVault);

      const result = await createVault("Novo Vault");

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.vault.create).toHaveBeenCalledWith({
        data: {
          name: "Novo Vault",
          userId: 1,
        },
        include: { words: true },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home/vault");
      expect(result).toEqual(mockVault);
    });

    it("deve falhar se nome for vazio", async () => {
      await expect(createVault("")).rejects.toThrow("Erro ao criar vault");
    });

    it("deve falhar se usuário não estiver autenticado", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(createVault("Novo Vault")).rejects.toThrow(
        "Erro ao criar vault"
      );
    });
  });

  describe("deleteVault", () => {
    it("deve deletar vault com sucesso", async () => {
      const mockVault = {
        id: 1,
        name: "Vault para deletar",
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        words: [],
      };

      mockPrisma.vault.findUnique.mockResolvedValue(mockVault);
      mockPrisma.vault.delete.mockResolvedValue(mockVault);

      await deleteVault(1);

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.vault.findUnique).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
        include: {
          words: {
            include: {
              Word_A: true,
              Word_B: true,
            },
          },
        },
      });
      expect(mockPrisma.vault.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home/vault");
    });

    it("deve falhar se vault não for encontrado", async () => {
      mockPrisma.vault.findUnique.mockResolvedValue(null);

      await expect(deleteVault(999)).rejects.toThrow(
        "Vault não encontrado ou não pertence ao usuário"
      );
    });
  });

  describe("createWord", () => {
    const validWordData: CreateWordData = {
      name: "hello",
      grammaticalClass: "interjection",
      category: "greeting",
      translations: ["olá", "oi"],
      confidence: 3,
      vaultId: 1,
    };

    it("deve criar palavra com sucesso", async () => {
      const mockVault = {
        id: 1,
        name: "Vault 1",
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockWord = {
        id: 1,
        name: "hello",
        grammaticalClass: "interjection",
        category: "greeting",
        translations: ["olá", "oi"],
        confidence: 3,
        isSaved: true,
        vaultId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.vault.findUnique.mockResolvedValue(mockVault);
      mockPrisma.word.create.mockResolvedValue(mockWord);

      const result = await createWord(validWordData);

      expect(mockPrisma.vault.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrisma.word.create).toHaveBeenCalledWith({
        data: {
          name: "hello",
          grammaticalClass: "interjection",
          category: "greeting",
          translations: ["olá", "oi"],
          confidence: 3,
          vaultId: 1,
          status: true,
          isSaved: true,
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home/vault");
      expect(result).toEqual({
        id: 1,
        name: "hello",
        grammaticalClass: "interjection",
        category: "greeting",
        translations: ["olá", "oi"],
        confidence: 3,
        isSaved: true,
        vaultId: 1,
      });
    });

    it("deve falhar se dados obrigatórios não forem fornecidos", async () => {
      const invalidData = {
        name: "",
        grammaticalClass: "",
        vaultId: 0,
      } as CreateWordData;

      await expect(createWord(invalidData)).rejects.toThrow(
        "Nome da palavra e classe gramatical são obrigatórios"
      );
    });

    it("deve falhar se vault não for encontrado", async () => {
      mockPrisma.vault.findUnique.mockResolvedValue(null);

      await expect(createWord(validWordData)).rejects.toThrow(
        "Vault não encontrado"
      );
    });
  });

  describe("searchWordInVaults", () => {
    it("deve buscar palavras com sucesso", async () => {
      const mockWords = [
        {
          id: 1,
          name: "hello",
          grammaticalClass: "interjection",
          category: "greeting",
          translations: ["olá", "oi"],
          confidence: 3,
          isSaved: true,
          vaultId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          vault: {
            id: 1,
            name: "Vault 1",
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];

      mockPrisma.word.findMany.mockResolvedValue(mockWords);

      const result = await searchWordInVaults("hello");

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.word.findMany).toHaveBeenCalledWith({
        where: {
          vault: { userId: 1 },
          OR: [
            {
              name: {
                contains: "hello",
                mode: "insensitive",
              },
            },
            {
              translations: {
                hasSome: ["hello"],
              },
            },
            {
              category: {
                contains: "hello",
                mode: "insensitive",
              },
            },
          ],
        },
        include: {
          vault: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
              userId: true,
            },
          },
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].word.name).toBe("hello");
      expect(result[0].vault.name).toBe("Vault 1");
    });

    it("deve retornar array vazio se termo de busca for vazio", async () => {
      const result = await searchWordInVaults("");

      expect(result).toEqual([]);
    });
  });

  describe("wordExistsInVault", () => {
    it("deve retornar true se palavra existir no vault", async () => {
      const mockWord = {
        id: 1,
        name: "hello",
        grammaticalClass: "interjection",
        category: "greeting",
        translations: ["olá", "oi"],
        confidence: 3,
        isSaved: true,
        vaultId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.word.findFirst.mockResolvedValue(mockWord);

      const result = await wordExistsInVault("hello", 1);

      expect(mockPrisma.word.findFirst).toHaveBeenCalledWith({
        where: {
          name: {
            equals: "hello",
            mode: "insensitive",
          },
          vaultId: 1,
        },
      });
      expect(result).toBe(true);
    });

    it("deve retornar false se palavra não existir no vault", async () => {
      mockPrisma.word.findFirst.mockResolvedValue(null);

      const result = await wordExistsInVault("nonexistent", 1);

      expect(result).toBe(false);
    });
  });

  describe("updateWord", () => {
    it("deve atualizar palavra com sucesso", async () => {
      const mockExistingWord = {
        id: 1,
        name: "hello",
        grammaticalClass: "interjection",
        category: "greeting",
        translations: ["olá", "oi"],
        confidence: 3,
        isSaved: true,
        vaultId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedWord = {
        ...mockExistingWord,
        name: "hi",
        translations: ["oi", "e aí"],
      };

      mockPrisma.word.findUnique.mockResolvedValue(mockExistingWord);
      mockPrisma.word.update.mockResolvedValue(mockUpdatedWord);

      const result = await updateWord(1, {
        name: "hi",
        translations: ["oi", "e aí"],
      });

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.word.findUnique).toHaveBeenCalledWith({
        where: {
          id: 1,
          vault: { userId: 1 },
        },
      });
      expect(mockPrisma.word.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: "hi",
          translations: ["oi", "e aí"],
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home/vault");
      expect(result).toEqual({
        id: 1,
        name: "hi",
        grammaticalClass: "interjection",
        category: "greeting",
        translations: ["oi", "e aí"],
        confidence: 3,
        isSaved: true,
        vaultId: 1,
      });
    });

    it("deve falhar se palavra não for encontrada", async () => {
      mockPrisma.word.findUnique.mockResolvedValue(null);

      await expect(updateWord(999, { name: "new name" })).rejects.toThrow(
        "Palavra não encontrada ou não pertence ao usuário"
      );
    });
  });

  describe("linkWords", () => {
    it("deve linkar palavras com sucesso", async () => {
      const mockWord1 = {
        id: 1,
        name: "hello",
        grammaticalClass: "interjection",
        category: "greeting",
        translations: ["olá", "oi"],
        confidence: 3,
        isSaved: true,
        vaultId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockWord2 = {
        id: 2,
        name: "hi",
        grammaticalClass: "interjection",
        category: "greeting",
        translations: ["oi", "e aí"],
        confidence: 3,
        isSaved: true,
        vaultId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.word.findUnique
        .mockResolvedValueOnce(mockWord1)
        .mockResolvedValueOnce(mockWord2);
      mockPrisma.word.findFirst.mockResolvedValue(null); // Nenhuma relação existente
      mockPrisma.word.update.mockResolvedValue(mockWord1);

      await linkWords(1, 2);

      expect(mockPrisma.word.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrisma.word.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
      });
      expect(mockPrisma.word.findFirst).toHaveBeenCalled();
      expect(mockPrisma.word.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          Word_A: {
            connect: { id: 2 },
          },
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home/vault");
    });

    it("deve falhar se uma das palavras não for encontrada", async () => {
      mockPrisma.word.findUnique
        .mockResolvedValueOnce({
          id: 1,
          name: "hello",
          grammaticalClass: "interjection",
          category: "greeting",
          translations: ["olá", "oi"],
          confidence: 3,
          isSaved: true,
          vaultId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce(null);

      await expect(linkWords(1, 999)).rejects.toThrow(
        "Uma ou ambas as palavras não foram encontradas"
      );
    });

    it("deve falhar se palavras já estiverem linkadas", async () => {
      const mockWord1 = {
        id: 1,
        name: "hello",
        grammaticalClass: "interjection",
        category: "greeting",
        translations: ["olá", "oi"],
        confidence: 3,
        isSaved: true,
        vaultId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockWord2 = {
        id: 2,
        name: "hi",
        grammaticalClass: "interjection",
        category: "greeting",
        translations: ["oi", "e aí"],
        confidence: 3,
        isSaved: true,
        vaultId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.word.findUnique
        .mockResolvedValueOnce(mockWord1)
        .mockResolvedValueOnce(mockWord2);
      mockPrisma.word.findFirst.mockResolvedValue(mockWord1); // Relação já existe

      await expect(linkWords(1, 2)).rejects.toThrow(
        "As palavras já estão linkadas"
      );
    });
  });

  describe("unlinkWords", () => {
    it("deve deslinkar palavras com sucesso", async () => {
      mockPrisma.word.update.mockResolvedValue({
        id: 1,
        name: "hello",
        grammaticalClass: "interjection",
        category: "greeting",
        translations: ["olá", "oi"],
        confidence: 3,
        isSaved: true,
        vaultId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await unlinkWords(1, 2);

      expect(mockPrisma.word.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.word.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          Word_A: {
            disconnect: { id: 2 },
          },
        },
      });
      expect(mockPrisma.word.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: {
          Word_A: {
            disconnect: { id: 1 },
          },
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home/vault");
    });
  });

  describe("getRelatedWords", () => {
    it("deve buscar palavras relacionadas com sucesso", async () => {
      const mockWord = {
        id: 1,
        name: "hello",
        grammaticalClass: "interjection",
        category: "greeting",
        translations: ["olá", "oi"],
        confidence: 3,
        isSaved: true,
        vaultId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        Word_A: [
          {
            id: 2,
            name: "hi",
            grammaticalClass: "interjection",
            category: "greeting",
            translations: ["oi", "e aí"],
            confidence: 3,
            isSaved: true,
            vaultId: 1,
          },
        ],
        Word_B: [],
      };

      mockPrisma.word.findUnique.mockResolvedValue(mockWord);

      const result = await getRelatedWords(1);

      expect(mockPrisma.word.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          Word_A: {
            select: {
              id: true,
              name: true,
              grammaticalClass: true,
              category: true,
              translations: true,
              confidence: true,
              isSaved: true,
              vaultId: true,
            },
          },
          Word_B: {
            select: {
              id: true,
              name: true,
              grammaticalClass: true,
              category: true,
              translations: true,
              confidence: true,
              isSaved: true,
              vaultId: true,
            },
          },
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("hi");
    });

    it("deve falhar se palavra não for encontrada", async () => {
      mockPrisma.word.findUnique.mockResolvedValue(null);

      await expect(getRelatedWords(999)).rejects.toThrow(
        "Palavra não encontrada"
      );
    });
  });

  describe("createText", () => {
    it("deve criar texto com sucesso", async () => {
      const mockText = {
        id: 1,
        title: "Meu Texto",
        content: "Conteúdo do texto",
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.text.create.mockResolvedValue(mockText);

      const result = await createText("Meu Texto", "Conteúdo do texto");

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.text.create).toHaveBeenCalledWith({
        data: {
          title: "Meu Texto",
          content: "Conteúdo do texto",
          userId: 1,
        },
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/home/texts");
      expect(result).toEqual({
        id: 1,
        title: "Meu Texto",
        content: "Conteúdo do texto",
        userId: 1,
        createdAt: mockText.createdAt,
        updatedAt: mockText.updatedAt,
      });
    });

    it("deve falhar se usuário não estiver autenticado", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(createText("Título", "Conteúdo")).rejects.toThrow(
        "Usuário não autenticado"
      );
    });
  });

  describe("getUserTexts", () => {
    it("deve buscar textos do usuário com sucesso", async () => {
      const mockTexts = [
        {
          id: 1,
          title: "Texto 1",
          content: "Conteúdo 1",
          userId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          title: "Texto 2",
          content: "Conteúdo 2",
          userId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.text.findMany.mockResolvedValue(mockTexts);

      const result = await getUserTexts();

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.text.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { updatedAt: "desc" },
      });
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Texto 1");
      expect(result[1].title).toBe("Texto 2");
    });

    it("deve falhar se usuário não estiver autenticado", async () => {
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(getUserTexts()).rejects.toThrow("Usuário não autenticado");
    });
  });

  describe("exportVaultWords", () => {
    it("deve exportar palavras do vault com sucesso", async () => {
      const mockVault = {
        id: 1,
        name: "Vault 1",
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        words: [
          {
            name: "hello",
            grammaticalClass: "interjection",
            category: "greeting",
            translations: ["olá", "oi"],
            confidence: 3,
            isSaved: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      mockPrisma.vault.findUnique.mockResolvedValue(mockVault);

      const result = await exportVaultWords(1);

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.vault.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          words: {
            select: {
              name: true,
              grammaticalClass: true,
              category: true,
              translations: true,
              confidence: true,
              isSaved: true,
              createdAt: true,
              updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      const parsedResult = JSON.parse(result);
      expect(parsedResult.vaultName).toBe("Vault 1");
      expect(parsedResult.totalWords).toBe(1);
      expect(parsedResult.words).toHaveLength(1);
      expect(parsedResult.words[0].name).toBe("hello");
    });

    it("deve falhar se vault não for encontrado", async () => {
      mockPrisma.vault.findUnique.mockResolvedValue(null);

      await expect(exportVaultWords(999)).rejects.toThrow(
        "Erro ao exportar palavras"
      );
    });

    it("deve falhar se vault não pertencer ao usuário", async () => {
      const mockVault = {
        id: 1,
        name: "Vault 1",
        userId: 2, // Diferente do usuário autenticado
        createdAt: new Date(),
        updatedAt: new Date(),
        words: [],
      };

      mockPrisma.vault.findUnique.mockResolvedValue(mockVault);

      await expect(exportVaultWords(1)).rejects.toThrow(
        "Erro ao exportar palavras"
      );
    });
  });

  describe("importWordsToVault", () => {
    it("deve importar palavras com sucesso", async () => {
      const mockVault = {
        id: 1,
        name: "Vault 1",
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const importData = JSON.stringify({
        words: [
          {
            name: "hello",
            grammaticalClass: "interjection",
            category: "greeting",
            translations: ["olá", "oi"],
            confidence: 3,
            isSaved: true,
          },
        ],
      });

      mockPrisma.vault.findUnique.mockResolvedValue(mockVault);
      mockPrisma.word.findFirst.mockResolvedValue(null); // Palavra não existe
      mockTranslateDefinitions.mockResolvedValue(["olá", "oi"]);
      mockPrisma.word.create.mockResolvedValue({
        id: 1,
        name: "hello",
        grammaticalClass: "interjection",
        category: "greeting",
        translations: ["olá", "oi"],
        confidence: 3,
        isSaved: true,
        vaultId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await importWordsToVault(1, importData);

      expect(mockGetCurrentUser).toHaveBeenCalled();
      expect(mockPrisma.vault.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrisma.word.findFirst).toHaveBeenCalledWith({
        where: {
          name: "hello",
          vaultId: 1,
        },
      });
      expect(mockPrisma.word.create).toHaveBeenCalledWith({
        data: {
          name: "hello",
          grammaticalClass: "interjection",
          category: "greeting",
          translations: ["olá", "oi"],
          confidence: 3,
          isSaved: true,
          vaultId: 1,
        },
      });
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("deve falhar se formato de importação for inválido", async () => {
      const invalidImportData = JSON.stringify({ invalid: "data" });

      await expect(importWordsToVault(1, invalidImportData)).rejects.toThrow(
        "Erro ao importar palavras"
      );
    });

    it("deve falhar se vault não pertencer ao usuário", async () => {
      const mockVault = {
        id: 1,
        name: "Vault 1",
        userId: 2, // Diferente do usuário autenticado
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const importData = JSON.stringify({
        words: [
          {
            name: "hello",
            grammaticalClass: "interjection",
            category: "greeting",
            translations: ["olá", "oi"],
            confidence: 3,
            isSaved: true,
          },
        ],
      });

      mockPrisma.vault.findUnique.mockResolvedValue(mockVault);

      await expect(importWordsToVault(1, importData)).rejects.toThrow(
        "Erro ao importar palavras"
      );
    });
  });
});
