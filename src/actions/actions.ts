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
  isDeleting?: boolean; // Propriedade opcional para UI
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
  createdAt?: Date; // Opcional, será definido automaticamente
  updatedAt?: Date; // Opcional, será definido automaticamente
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
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: "desc", // Mais recentes primeiro
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
    console.log(`=== INÍCIO deleteVault ===`);
    console.log(`Tentando deletar vault com ID: ${vaultId}`);

    if (!vaultId || isNaN(vaultId)) {
      throw new Error("ID do vault inválido");
    }

    // Verificar se o vault existe e buscar suas palavras
    const existingVault = await prisma.vault.findUnique({
      where: { id: vaultId },
      include: {
        words: {
          include: {
            Word_A: true,
            Word_B: true,
          },
        },
      },
    });

    if (!existingVault) {
      throw new Error("Vault não encontrado");
    }

    console.log(`Vault encontrado: ${existingVault.name}`);
    console.log(`Palavras no vault: ${existingVault.words.length}`);

    // Primeiro, desfazer todas as conexões entre palavras
    if (existingVault.words.length > 0) {
      console.log("Desfazendo conexões entre palavras...");

      for (const word of existingVault.words) {
        const relatedWords = [...word.Word_A, ...word.Word_B];

        if (relatedWords.length > 0) {
          console.log(
            `Desfazendo ${relatedWords.length} conexões da palavra "${word.name}"`
          );

          for (const relatedWord of relatedWords) {
            try {
              await prisma.word.update({
                where: { id: word.id },
                data: {
                  Word_A: {
                    disconnect: { id: relatedWord.id },
                  },
                },
              });
              console.log(
                `Conexão desfeita entre "${word.name}" e "${relatedWord.name}"`
              );
            } catch (error) {
              console.warn(
                `Erro ao desfazer conexão entre "${word.name}" e "${relatedWord.name}":`,
                error
              );
            }
          }
        }
      }
    }

    // Deletar todas as palavras do vault
    if (existingVault.words.length > 0) {
      console.log("Deletando palavras do vault...");

      for (const word of existingVault.words) {
        try {
          await prisma.word.delete({
            where: { id: word.id },
          });
          console.log(`Palavra "${word.name}" deletada com sucesso`);
        } catch (error) {
          console.warn(`Erro ao deletar palavra "${word.name}":`, error);
        }
      }
    }

    // Deletar o vault
    await prisma.vault.delete({
      where: { id: vaultId },
    });

    console.log(`Vault "${existingVault.name}" deletado com sucesso`);
    console.log(`=== FIM deleteVault - SUCESSO ===`);

    // Revalidar as páginas
    revalidatePath("/home");
    revalidatePath("/home/vault");
  } catch (error) {
    console.error("=== ERRO em deleteVault ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao deletar vault: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
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
      vaultId: newWord.vaultId,
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

// Deletar palavra completamente do banco
export async function deleteWord(wordId: number): Promise<void> {
  try {
    console.log("=== INÍCIO deleteWord ===");
    console.log("Deletando palavra:", wordId);

    // Verificar se a palavra existe
    const existingWord = await prisma.word.findUnique({
      where: { id: wordId },
    });

    if (!existingWord) {
      throw new Error("Palavra não encontrada");
    }

    // Deletar a palavra
    await prisma.word.delete({
      where: { id: wordId },
    });

    console.log("Palavra deletada com sucesso");
    console.log("=== FIM deleteWord - SUCESSO ===");

    // Revalidar as páginas
    revalidatePath("/home");
    revalidatePath("/home/vault");
  } catch (error) {
    console.error("=== ERRO em deleteWord ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao deletar palavra: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Remover palavra de um vault específico
export async function removeWordFromVault(
  wordName: string,
  vaultId: number
): Promise<void> {
  try {
    console.log("=== INÍCIO removeWordFromVault ===");
    console.log("Removendo palavra:", wordName, "do vault:", vaultId);

    // Verificar se o vault existe
    const existingVault = await prisma.vault.findUnique({
      where: { id: vaultId },
    });

    if (!existingVault) {
      throw new Error("Vault não encontrado");
    }

    // Buscar a palavra no vault
    const existingWord = await prisma.word.findFirst({
      where: {
        name: {
          equals: wordName,
          mode: "insensitive",
        },
        vaultId: vaultId,
      },
    });

    if (!existingWord) {
      throw new Error("Palavra não encontrada no vault");
    }

    // Deletar a palavra do vault
    await prisma.word.delete({
      where: { id: existingWord.id },
    });

    console.log("Palavra removida do vault com sucesso");
    console.log("=== FIM removeWordFromVault - SUCESSO ===");

    // Revalidar as páginas
    revalidatePath("/home");
    revalidatePath("/home/vault");
  } catch (error) {
    console.error("=== ERRO em removeWordFromVault ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao remover palavra do vault: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Editar palavra existente
export async function updateWord(
  wordId: number,
  data: {
    name?: string;
    grammaticalClass?: string;
    category?: string | null;
    translations?: string[];
    confidence?: number;
  }
): Promise<Word> {
  try {
    console.log("=== INÍCIO updateWord ===");
    console.log("Editando palavra:", wordId, "com dados:", data);

    // Verificar se a palavra existe
    const existingWord = await prisma.word.findUnique({
      where: { id: wordId },
    });

    if (!existingWord) {
      throw new Error("Palavra não encontrada");
    }

    // Preparar dados para atualização
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.grammaticalClass !== undefined) {
      updateData.grammaticalClass = data.grammaticalClass;
    }
    if (data.category !== undefined) {
      updateData.category = data.category;
    }
    if (data.translations !== undefined) {
      updateData.translations = data.translations;
    }
    if (data.confidence !== undefined) {
      updateData.confidence = data.confidence;
    }

    // Atualizar a palavra
    const updatedWord = await prisma.word.update({
      where: { id: wordId },
      data: updateData,
    });

    console.log("Palavra atualizada com sucesso:", updatedWord);
    console.log("=== FIM updateWord - SUCESSO ===");

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
      vaultId: updatedWord.vaultId,
    };
  } catch (error) {
    console.error("=== ERRO em updateWord ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao editar palavra: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Linkar duas palavras
export async function linkWords(
  wordId1: number,
  wordId2: number
): Promise<void> {
  try {
    console.log("=== INÍCIO linkWords ===");
    console.log("Linkando palavras:", wordId1, "e", wordId2);

    // Verificar se as palavras existem
    const word1 = await prisma.word.findUnique({
      where: { id: wordId1 },
    });

    const word2 = await prisma.word.findUnique({
      where: { id: wordId2 },
    });

    if (!word1 || !word2) {
      throw new Error("Uma ou ambas as palavras não foram encontradas");
    }

    // Verificar se já existe um relacionamento
    const existingLink = await prisma.word.findFirst({
      where: {
        OR: [
          {
            id: wordId1,
            Word_A: { some: { id: wordId2 } },
          },
          {
            id: wordId2,
            Word_A: { some: { id: wordId1 } },
          },
        ],
      },
    });

    if (existingLink) {
      throw new Error("As palavras já estão linkadas");
    }

    // Criar o relacionamento bidirecional
    await prisma.word.update({
      where: { id: wordId1 },
      data: {
        Word_A: {
          connect: { id: wordId2 },
        },
      },
    });

    console.log("Palavras linkadas com sucesso");
    console.log("=== FIM linkWords - SUCESSO ===");

    // Revalidar as páginas
    revalidatePath("/home");
    revalidatePath("/home/vault");
  } catch (error) {
    console.error("=== ERRO em linkWords ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao linkar palavras: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Deslinkar duas palavras
export async function unlinkWords(
  wordId1: number,
  wordId2: number
): Promise<void> {
  try {
    console.log("=== INÍCIO unlinkWords ===");
    console.log("Deslinkando palavras:", wordId1, "e", wordId2);

    // Remover o relacionamento bidirecional
    await Promise.all([
      prisma.word.update({
        where: { id: wordId1 },
        data: {
          Word_A: {
            disconnect: { id: wordId2 },
          },
        },
      }),
      prisma.word.update({
        where: { id: wordId2 },
        data: {
          Word_A: {
            disconnect: { id: wordId1 },
          },
        },
      }),
    ]);

    console.log("Palavras deslinkadas com sucesso");
    console.log("=== FIM unlinkWords - SUCESSO ===");

    // Revalidar as páginas
    revalidatePath("/home");
    revalidatePath("/home/vault");
  } catch (error) {
    console.error("=== ERRO em unlinkWords ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao deslinkar palavras: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Buscar palavras relacionadas
export async function getRelatedWords(wordId: number): Promise<Word[]> {
  try {
    console.log("=== INÍCIO getRelatedWords ===");
    console.log("Buscando palavras relacionadas para:", wordId);

    const word = await prisma.word.findUnique({
      where: { id: wordId },
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

    if (!word) {
      throw new Error("Palavra não encontrada");
    }

    // Combinar palavras relacionadas de ambas as direções
    const relatedWords = [...word.Word_A, ...word.Word_B];

    console.log("Palavras relacionadas encontradas:", relatedWords.length);
    console.log("=== FIM getRelatedWords - SUCESSO ===");

    return relatedWords;
  } catch (error) {
    console.error("=== ERRO em getRelatedWords ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao buscar palavras relacionadas: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Buscar palavras para linkar (excluindo a atual e já relacionadas)
export async function getLinkableWords(wordId: number): Promise<Word[]> {
  try {
    console.log("=== INÍCIO getLinkableWords ===");
    console.log("Buscando palavras linkáveis para:", wordId);

    // Buscar a palavra atual com suas relações
    const currentWord = await prisma.word.findUnique({
      where: { id: wordId },
      include: {
        Word_A: { select: { id: true } },
        Word_B: { select: { id: true } },
      },
    });

    if (!currentWord) {
      throw new Error("Palavra não encontrada");
    }

    // IDs de palavras já relacionadas
    const relatedIds = new Set([
      ...currentWord.Word_A.map((w) => w.id),
      ...currentWord.Word_B.map((w) => w.id),
      wordId, // Excluir a própria palavra
    ]);

    // Buscar todas as outras palavras
    const allWords = await prisma.word.findMany({
      where: {
        id: { notIn: Array.from(relatedIds) },
      },
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
      orderBy: { name: "asc" },
    });

    console.log("Palavras linkáveis encontradas:", allWords.length);
    console.log("=== FIM getLinkableWords - SUCESSO ===");

    return allWords;
  } catch (error) {
    console.error("=== ERRO em getLinkableWords ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao buscar palavras linkáveis: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Buscar todas as relações entre palavras
export async function getAllWordRelations(): Promise<
  Array<{ wordA: Word; wordB: Word }>
> {
  try {
    console.log("=== INÍCIO getAllWordRelations ===");

    // Buscar todas as palavras que têm relacionamentos
    const wordsWithRelations = await prisma.word.findMany({
      where: {
        OR: [{ Word_A: { some: {} } }, { Word_B: { some: {} } }],
      },
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

    // Processar as relações
    const relations: Array<{ wordA: Word; wordB: Word }> = [];

    wordsWithRelations.forEach((word) => {
      // Adicionar relações Word_A
      word.Word_A.forEach((relatedWord) => {
        relations.push({
          wordA: word,
          wordB: relatedWord,
        });
      });

      // Adicionar relações Word_B
      word.Word_B.forEach((relatedWord) => {
        relations.push({
          wordA: relatedWord,
          wordB: word,
        });
      });
    });

    // Remover duplicatas (mesma relação em ambas as direções)
    const uniqueRelations = relations.filter((relation, index, self) => {
      const key = `${Math.min(relation.wordA.id, relation.wordB.id)}-${Math.max(
        relation.wordA.id,
        relation.wordB.id
      )}`;
      return (
        index ===
        self.findIndex((r) => {
          const rKey = `${Math.min(r.wordA.id, r.wordB.id)}-${Math.max(
            r.wordA.id,
            r.wordB.id
          )}`;
          return rKey === key;
        })
      );
    });

    console.log("Relações encontradas:", uniqueRelations.length);
    console.log("=== FIM getAllWordRelations - SUCESSO ===");

    return uniqueRelations;
  } catch (error) {
    console.error("=== ERRO em getAllWordRelations ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao buscar relações entre palavras: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Interface para Texto
export interface Text {
  id: number;
  title: string;
  content: string;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

// Criar novo texto
export async function createText(
  title: string,
  content: string,
  userId: number
): Promise<Text> {
  try {
    console.log("=== INÍCIO createText ===");
    console.log("Criando texto:", title);

    const newText = await prisma.text.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        userId: userId,
      },
    });

    console.log("Texto criado com sucesso:", newText);
    console.log("=== FIM createText - SUCESSO ===");

    // Revalidar as páginas
    revalidatePath("/home");
    revalidatePath("/home/texts");

    return {
      id: newText.id,
      title: newText.title,
      content: newText.content,
      userId: newText.userId,
      createdAt: newText.createdAt,
      updatedAt: newText.updatedAt,
    };
  } catch (error) {
    console.error("=== ERRO em createText ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao criar texto: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Buscar textos do usuário
export async function getUserTexts(userId: number): Promise<Text[]> {
  try {
    console.log("=== INÍCIO getUserTexts ===");
    console.log("Buscando textos para usuário:", userId);

    const texts = await prisma.text.findMany({
      where: { userId: userId },
      orderBy: { updatedAt: "desc" },
    });

    console.log("Textos encontrados:", texts.length);
    console.log("=== FIM getUserTexts - SUCESSO ===");

    return texts.map((text) => ({
      id: text.id,
      title: text.title,
      content: text.content,
      userId: text.userId,
      createdAt: text.createdAt,
      updatedAt: text.updatedAt,
    }));
  } catch (error) {
    console.error("=== ERRO em getUserTexts ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao buscar textos: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Atualizar texto
export async function updateText(
  textId: number,
  title: string,
  content: string
): Promise<Text> {
  try {
    console.log("=== INÍCIO updateText ===");
    console.log("Atualizando texto:", textId);

    const updatedText = await prisma.text.update({
      where: { id: textId },
      data: {
        title: title.trim(),
        content: content.trim(),
        updatedAt: new Date(),
      },
    });

    console.log("Texto atualizado com sucesso:", updatedText);
    console.log("=== FIM updateText - SUCESSO ===");

    // Revalidar as páginas
    revalidatePath("/home");
    revalidatePath("/home/texts");

    return {
      id: updatedText.id,
      title: updatedText.title,
      content: updatedText.content,
      userId: updatedText.userId,
      createdAt: updatedText.createdAt,
      updatedAt: updatedText.updatedAt,
    };
  } catch (error) {
    console.error("=== ERRO em updateText ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao atualizar texto: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Deletar texto
export async function deleteText(textId: number): Promise<void> {
  try {
    console.log("=== INÍCIO deleteText ===");
    console.log("Deletando texto:", textId);

    await prisma.text.delete({
      where: { id: textId },
    });

    console.log("Texto deletado com sucesso");
    console.log("=== FIM deleteText - SUCESSO ===");

    // Revalidar as páginas
    revalidatePath("/home");
    revalidatePath("/home/texts");
  } catch (error) {
    console.error("=== ERRO em deleteText ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao deletar texto: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Verificar palavras do texto que estão nos vaults
export async function checkTextWords(
  content: string,
  userId: number
): Promise<Array<{ word: string; vaultInfo: Vault[] }>> {
  try {
    console.log("=== INÍCIO checkTextWords ===");
    console.log("Verificando palavras do texto para usuário:", userId);

    // Extrair palavras únicas do texto (apenas palavras em inglês)
    const words = content.toLowerCase().match(/\b[a-z]+\b/g) || [];

    const uniqueWords = [...new Set(words)];

    // Buscar todas as palavras dos vaults do usuário
    const userVaults = await prisma.vault.findMany({
      where: { userId: userId },
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
    });

    // Mapear palavras encontradas com seus vaults
    const foundWords = uniqueWords
      .map((word) => {
        const matchingVaults = userVaults.filter((vault) =>
          vault.words.some(
            (vaultWord) => vaultWord.name.toLowerCase() === word.toLowerCase()
          )
        );

        if (matchingVaults.length > 0) {
          return {
            word,
            vaultInfo: matchingVaults.map((vault) => ({
              id: vault.id,
              name: vault.name,
              words: vault.words.filter(
                (vaultWord) =>
                  vaultWord.name.toLowerCase() === word.toLowerCase()
              ),
            })),
          };
        }
        return null;
      })
      .filter((item) => item !== null) as Array<{
      word: string;
      vaultInfo: Vault[];
    }>;

    console.log("Palavras encontradas nos vaults:", foundWords.length);
    console.log("=== FIM checkTextWords - SUCESSO ===");

    return foundWords;
  } catch (error) {
    console.error("=== ERRO em checkTextWords ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao verificar palavras do texto: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}

// Editar nome do vault
export async function updateVaultName(
  vaultId: number,
  newName: string
): Promise<Vault> {
  try {
    console.log("=== INÍCIO updateVaultName ===");
    console.log("Editando vault:", vaultId, "com novo nome:", newName);

    if (
      !newName ||
      typeof newName !== "string" ||
      newName.trim().length === 0
    ) {
      throw new Error("Nome do vault é obrigatório");
    }

    // Verificar se o vault existe
    const existingVault = await prisma.vault.findUnique({
      where: { id: vaultId },
    });

    if (!existingVault) {
      throw new Error("Vault não encontrado");
    }

    // Atualizar o nome do vault
    const updatedVault = await prisma.vault.update({
      where: { id: vaultId },
      data: {
        name: newName.trim(),
        updatedAt: new Date(),
      },
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
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    console.log("Vault atualizado com sucesso:", updatedVault);
    console.log("=== FIM updateVaultName - SUCESSO ===");

    // Revalidar as páginas
    revalidatePath("/home");
    revalidatePath("/home/vault");

    return updatedVault;
  } catch (error) {
    console.error("=== ERRO em updateVaultName ===");
    console.error("Erro completo:", error);
    throw new Error(
      `Erro ao editar vault: ${
        error instanceof Error ? error.message : "Erro desconhecido"
      }`
    );
  }
}
