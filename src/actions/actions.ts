"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface Vault {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  words: Word[];
}

export interface Word {
  id: number;
  name: string;
  grammaticalClass: string;
  category: string | null; // Pode ser null no banco
  translations: string[];
  confidence: number; // 1-4
  isSaved: boolean;
  vaultId: number; // ID do vault onde a palavra está
}

export interface CreateWordData {
  name: string;
  grammaticalClass: string;
  category?: string; // Opcional
  translations: string[];
  confidence: number; // 1-4
  vaultId: number;
  isSaved?: boolean; // Opcional, padrão true
}

export interface SearchResult {
  word: Word;
  vault: {
    id: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    userId: number;
  };
}

// Buscar todos os vaults
export async function getVaults(): Promise<Vault[]> {
  try {
    const vaults = await prisma.vault.findMany({
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return vaults;
  } catch (error) {
    console.error("Erro ao buscar vaults:", error);
    throw new Error("Erro ao buscar vaults");
  }
}

// Criar novo vault
export async function createVault(name: string): Promise<Vault> {
  try {
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new Error("Nome do vault é obrigatório");
    }

    // TODO: Pegar o userId do usuário autenticado
    // Por enquanto, usando userId = 1 como mock
    const userId = 1;

    const newVault = await prisma.vault.create({
      data: {
        name: name.trim(),
        userId: userId,
      },
      include: {
        words: true,
      },
    });

    // Revalidar a página para mostrar o novo vault
    revalidatePath("/home/vault");

    return newVault;
  } catch (error) {
    console.error("Erro ao criar vault:", error);
    throw new Error("Erro ao criar vault");
  }
}

// Deletar vault
export async function deleteVault(vaultId: number): Promise<void> {
  try {
    if (!vaultId || isNaN(vaultId)) {
      throw new Error("ID do vault inválido");
    }

    // Verificar se o vault existe
    const existingVault = await prisma.vault.findUnique({
      where: { id: vaultId },
    });

    if (!existingVault) {
      throw new Error("Vault não encontrado");
    }

    // Deletar o vault (as palavras serão deletadas em cascata se configurado no schema)
    await prisma.vault.delete({
      where: { id: vaultId },
    });

    // Revalidar a página para remover o vault deletado
    revalidatePath("/home/vault");
  } catch (error) {
    console.error("Erro ao deletar vault:", error);
    throw new Error("Erro ao deletar vault");
  }
}

// Criar nova palavra
export async function createWord(data: CreateWordData): Promise<Word> {
  try {
    console.log("=== INÍCIO createWord ===");
    console.log("createWord chamada com dados:", data);

    if (!data.name || !data.grammaticalClass || !data.vaultId) {
      console.error("Validação falhou:", {
        name: !!data.name,
        grammaticalClass: !!data.grammaticalClass,
        vaultId: !!data.vaultId,
      });
      throw new Error("Nome da palavra e classe gramatical são obrigatórios");
    }

    if (data.name.trim().length === 0) {
      console.error("Nome da palavra está vazio após trim");
      throw new Error("Nome da palavra é obrigatório");
    }

    console.log("Validações passaram, buscando vault...");

    // Verificar se o vault existe
    const existingVault = await prisma.vault.findUnique({
      where: { id: data.vaultId },
    });

    console.log("Vault encontrado:", existingVault);

    if (!existingVault) {
      console.error("Vault não encontrado para ID:", data.vaultId);
      throw new Error("Vault não encontrado");
    }

    // Criar a palavra
    const wordData = {
      name: data.name.trim(),
      grammaticalClass: data.grammaticalClass,
      category: data.category || null,
      translations: data.translations,
      confidence: data.confidence,
      vaultId: data.vaultId,
      status: true,
      isSaved: data.isSaved ?? true, // true por padrão se não especificado
    };

    console.log("Dados para criar palavra:", wordData);
    console.log("Tentando criar palavra no banco...");

    const newWord = await prisma.word.create({
      data: wordData as any, // Type assertion para resolver problema de tipo
    });

    console.log("Palavra criada no banco com sucesso:", newWord);
    console.log("=== FIM createWord - SUCESSO ===");

    // Revalidar as páginas
    console.log("Revalidando páginas...");
    revalidatePath("/home");
    revalidatePath("/home/vault");
    console.log("Páginas revalidadas");

    return {
      id: newWord.id,
      name: newWord.name,
      grammaticalClass: newWord.grammaticalClass,
      category: newWord.category,
      translations: newWord.translations,
      confidence: newWord.confidence,
      isSaved: newWord.isSaved,
      vaultId: newWord.vaultId, // Adicionar vaultId ao retorno
    };
  } catch (error) {
    console.error("=== ERRO em createWord ===");
    console.error("Tipo do erro:", typeof error);
    console.error("Erro completo:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "N/A");
    console.error("=== FIM ERRO ===");

    if (error instanceof Error) {
      throw new Error(`Erro ao criar palavra: ${error.message}`);
    } else {
      throw new Error("Erro desconhecido ao criar palavra");
    }
  }
}

// Buscar palavra em todos os vaults
export async function searchWordInVaults(
  searchTerm: string
): Promise<SearchResult[]> {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    const trimmedSearch = searchTerm.trim().toLowerCase();

    // Buscar palavras que contenham o termo de pesquisa
    const words = await prisma.word.findMany({
      where: {
        OR: [
          {
            name: {
              contains: trimmedSearch,
              mode: "insensitive",
            },
          },
          {
            translations: {
              hasSome: [trimmedSearch],
            },
          },
          {
            category: {
              contains: trimmedSearch,
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

    // Formatar resultado
    const results: SearchResult[] = words.map((word) => ({
      word: {
        id: word.id,
        name: word.name,
        grammaticalClass: word.grammaticalClass,
        category: word.category,
        translations: word.translations,
        confidence: word.confidence,
        isSaved: word.isSaved,
        vaultId: word.vaultId, // Adicionar vaultId ao resultado
      },
      vault: word.vault,
    }));

    return results;
  } catch (error) {
    console.error("Erro ao buscar palavra:", error);
    throw new Error("Erro ao buscar palavra");
  }
}

// Verificar se uma palavra já existe em um vault
export async function wordExistsInVault(
  wordName: string,
  vaultId: number
): Promise<boolean> {
  try {
    const existingWord = await prisma.word.findFirst({
      where: {
        name: {
          equals: wordName,
          mode: "insensitive", // Case insensitive
        },
        vaultId: vaultId,
      },
    });

    return !!existingWord;
  } catch (error) {
    console.error("Erro ao verificar se palavra existe no vault:", error);
    return false;
  }
}

// Mover palavra para outro vault
export async function moveWordToVault(
  wordId: number,
  newVaultId: number
): Promise<Word> {
  try {
    console.log("=== INÍCIO moveWordToVault ===");
    console.log("Movendo palavra:", wordId, "para vault:", newVaultId);

    // Verificar se o novo vault existe
    const existingVault = await prisma.vault.findUnique({
      where: { id: newVaultId },
    });

    if (!existingVault) {
      throw new Error("Vault de destino não encontrado");
    }

    // Verificar se a palavra já existe no novo vault
    const existingWord = await prisma.word.findFirst({
      where: {
        name: {
          equals: (
            await prisma.word.findUnique({ where: { id: wordId } })
          )?.name,
          mode: "insensitive",
        },
        vaultId: newVaultId,
      },
    });

    if (existingWord) {
      throw new Error("Palavra já existe no vault de destino");
    }

    // Atualizar a palavra para o novo vault
    const updatedWord = await prisma.word.update({
      where: { id: wordId },
      data: {
        vaultId: newVaultId,
        isSaved: true, // Sempre true ao mover para um vault
      },
    });

    console.log("Palavra movida com sucesso:", updatedWord);
    console.log("=== FIM moveWordToVault - SUCESSO ===");

    // Revalidar as páginas
    revalidatePath("/home");
    revalidatePath("/home/vault");

    return {
      id: updatedWord.id,
      name: updatedWord.name,
      grammaticalClass: updatedWord.grammaticalClass,
      category: updatedWord.category,
      translations: updatedWord.translations,
      confidence: updatedWord.confidence,
      isSaved: updatedWord.isSaved,
      vaultId: updatedWord.vaultId, // Adicionar vaultId ao retorno
    };
  } catch (error) {
    console.error("=== ERRO em moveWordToVault ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao mover palavra: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Fazer unsave da palavra (remover do vault atual)
export async function unsaveWord(wordId: number): Promise<Word> {
  try {
    console.log("=== INÍCIO unsaveWord ===");
    console.log("Fazendo unsave da palavra:", wordId);

    // Atualizar a palavra para isSaved = false
    const updatedWord = await prisma.word.update({
      where: { id: wordId },
      data: {
        isSaved: false,
      },
    });

    console.log("Palavra com unsave feito com sucesso:", updatedWord);
    console.log("=== FIM unsaveWord - SUCESSO ===");

    // Revalidar as páginas
    revalidatePath("/home");
    revalidatePath("/home/vault");

    return {
      id: updatedWord.id,
      name: updatedWord.name,
      grammaticalClass: updatedWord.grammaticalClass,
      category: updatedWord.category,
      translations: updatedWord.translations,
      confidence: updatedWord.confidence,
      isSaved: updatedWord.isSaved,
      vaultId: updatedWord.vaultId, // Adicionar vaultId ao retorno
    };
  } catch (error) {
    console.error("=== ERRO em unsaveWord ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao fazer unsave da palavra: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}
