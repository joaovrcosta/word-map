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
  category: string;
  translations: string[];
  confidence: number;
  isSaved: boolean;
}

export interface CreateWordData {
  name: string;
  grammaticalClass: string;
  category: string;
  translations: string[];
  confidence: number;
  vaultId: number;
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
    if (
      !data.name ||
      !data.grammaticalClass ||
      !data.category ||
      !data.vaultId
    ) {
      throw new Error("Todos os campos obrigatórios devem ser preenchidos");
    }

    if (data.name.trim().length === 0) {
      throw new Error("Nome da palavra é obrigatório");
    }

    // Verificar se o vault existe
    const existingVault = await prisma.vault.findUnique({
      where: { id: data.vaultId },
    });

    if (!existingVault) {
      throw new Error("Vault não encontrado");
    }

    // Criar a palavra
    const newWord = await prisma.word.create({
      data: {
        name: data.name.trim(),
        grammaticalClass: data.grammaticalClass,
        category: data.category,
        translations: data.translations,
        confidence: data.confidence,
        vaultId: data.vaultId,
        status: true,
        isSaved: false,
      },
    });

    // Revalidar as páginas
    revalidatePath("/home");
    revalidatePath("/home/vault");

    return {
      id: newWord.id,
      name: newWord.name,
      grammaticalClass: newWord.grammaticalClass,
      category: newWord.category,
      translations: newWord.translations,
      confidence: newWord.confidence,
      isSaved: newWord.isSaved,
    };
  } catch (error) {
    console.error("Erro ao criar palavra:", error);
    throw new Error("Erro ao criar palavra");
  }
}
