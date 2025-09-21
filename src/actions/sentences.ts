"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth";
import { Word } from "@/actions/actions";

// Interfaces para frases
export interface Sentence {
  id: number;
  title?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  words: SentenceWord[];
}

export interface SentenceWord {
  id: number;
  sentenceId: number;
  wordId: number;
  position: number;
  highlightColor?: string;
  createdAt: Date;
  word: Word;
}

export interface CreateSentenceData {
  title?: string;
  notes?: string;
  words: {
    wordId?: number; // ID da palavra existente (opcional)
    wordData?: {
      // Dados da palavra nova (opcional)
      name: string;
      grammaticalClass: string;
      translations: string[];
      category?: string | null;
    };
    position: number;
    highlightColor?: string;
  }[];
}

// Criar nova frase
export async function createSentence(
  data: CreateSentenceData
): Promise<Sentence> {
  try {
    console.log("=== INÍCIO createSentence ===");
    console.log("Dados recebidos:", data);

    // Verificar se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Validar dados
    if (!data.words || data.words.length === 0) {
      throw new Error(
        "É necessário pelo menos uma palavra para criar uma frase"
      );
    }

    // Processar palavras - criar novas ou usar existentes
    const processedWords: {
      wordId: number;
      position: number;
      highlightColor?: string;
    }[] = [];

    for (const wordItem of data.words) {
      let wordId: number;

      if (wordItem.wordId) {
        // Palavra existente - verificar se pertence ao usuário
        const existingWord = await prisma.word.findFirst({
          where: {
            id: wordItem.wordId,
            vault: {
              userId: user.id,
            },
          },
        });

        if (!existingWord) {
          throw new Error(
            `Palavra com ID ${wordItem.wordId} não foi encontrada ou não pertence ao usuário`
          );
        }

        wordId = wordItem.wordId;
      } else if (wordItem.wordData) {
        // Palavra nova - criar um cofre temporário se necessário
        let vault = await prisma.vault.findFirst({
          where: {
            name: "Frase Builder",
            userId: user.id,
          },
        });

        if (!vault) {
          vault = await prisma.vault.create({
            data: {
              name: "Frase Builder",
              userId: user.id,
            },
          });
        }

        // Criar a nova palavra
        const newWord = await prisma.word.create({
          data: {
            name: wordItem.wordData.name,
            grammaticalClass: wordItem.wordData.grammaticalClass,
            translations: wordItem.wordData.translations,
            category: wordItem.wordData.category || null,
            vaultId: vault.id,
            confidence: 1,
            isSaved: false, // Marcada como não salva pois é temporária
            frequency: 0,
          },
        });

        wordId = newWord.id;
      } else {
        throw new Error("Cada palavra deve ter wordId ou wordData");
      }

      processedWords.push({
        wordId,
        position: wordItem.position,
        highlightColor: wordItem.highlightColor,
      });
    }

    // Criar a frase
    const sentence = await prisma.sentence.create({
      data: {
        title: data.title?.trim() || null,
        notes: data.notes?.trim() || null,
        userId: user.id,
      },
    });

    // Adicionar as palavras à frase
    const sentenceWords = await Promise.all(
      processedWords.map((wordData) =>
        prisma.sentenceWord.create({
          data: {
            sentenceId: sentence.id,
            wordId: wordData.wordId,
            position: wordData.position,
            highlightColor: wordData.highlightColor || null,
          },
          include: {
            word: {
              include: {
                vault: true,
              },
            },
          },
        })
      )
    );

    // Revalidar cache
    revalidatePath("/home/sentence-builder");

    console.log("Frase criada com sucesso:", sentence.id);
    console.log("=== FIM createSentence - SUCESSO ===");

    return {
      id: sentence.id,
      title: sentence.title || undefined,
      notes: sentence.notes || undefined,
      createdAt: sentence.createdAt,
      updatedAt: sentence.updatedAt,
      userId: sentence.userId,
      words: sentenceWords.map((sw) => ({
        id: sw.id,
        sentenceId: sw.sentenceId,
        wordId: sw.wordId,
        position: sw.position,
        highlightColor: sw.highlightColor || undefined,
        createdAt: sw.createdAt,
        word: {
          id: sw.word.id,
          name: sw.word.name,
          grammaticalClass: sw.word.grammaticalClass,
          category: sw.word.category,
          translations: sw.word.translations,
          confidence: sw.word.confidence,
          isSaved: sw.word.isSaved,
          frequency: sw.word.frequency,
          vaultId: sw.word.vaultId,
          createdAt: sw.word.createdAt,
        },
      })),
    };
  } catch (error) {
    console.error("Erro ao criar frase:", error);
    throw error;
  }
}

// Buscar frases do usuário
export async function getUserSentences(): Promise<Sentence[]> {
  try {
    console.log("=== INÍCIO getUserSentences ===");

    // Verificar se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Buscar frases do usuário
    const sentences = await prisma.sentence.findMany({
      where: {
        userId: user.id,
      },
      include: {
        words: {
          include: {
            word: {
              include: {
                vault: true,
              },
            },
          },
          orderBy: {
            position: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`Encontradas ${sentences.length} frases`);
    console.log("=== FIM getUserSentences - SUCESSO ===");

    return sentences.map((sentence) => ({
      id: sentence.id,
      title: sentence.title || undefined,
      notes: sentence.notes || undefined,
      createdAt: sentence.createdAt,
      updatedAt: sentence.updatedAt,
      userId: sentence.userId,
      words: sentence.words.map((sw) => ({
        id: sw.id,
        sentenceId: sw.sentenceId,
        wordId: sw.wordId,
        position: sw.position,
        highlightColor: sw.highlightColor || undefined,
        createdAt: sw.createdAt,
        word: {
          id: sw.word.id,
          name: sw.word.name,
          grammaticalClass: sw.word.grammaticalClass,
          category: sw.word.category,
          translations: sw.word.translations,
          confidence: sw.word.confidence,
          isSaved: sw.word.isSaved,
          frequency: sw.word.frequency,
          vaultId: sw.word.vaultId,
          createdAt: sw.word.createdAt,
        },
      })),
    }));
  } catch (error) {
    console.error("Erro ao buscar frases:", error);
    throw error;
  }
}

// Buscar frase por ID
export async function getSentenceById(
  sentenceId: number
): Promise<Sentence | null> {
  try {
    console.log("=== INÍCIO getSentenceById ===");
    console.log("ID da frase:", sentenceId);

    // Verificar se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Buscar a frase
    const sentence = await prisma.sentence.findFirst({
      where: {
        id: sentenceId,
        userId: user.id,
      },
      include: {
        words: {
          include: {
            word: {
              include: {
                vault: true,
              },
            },
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    if (!sentence) {
      console.log("Frase não encontrada ou não pertence ao usuário");
      return null;
    }

    console.log("Frase encontrada:", sentence.title || "Sem título");
    console.log("=== FIM getSentenceById - SUCESSO ===");

    return {
      id: sentence.id,
      title: sentence.title || undefined,
      notes: sentence.notes || undefined,
      createdAt: sentence.createdAt,
      updatedAt: sentence.updatedAt,
      userId: sentence.userId,
      words: sentence.words.map((sw) => ({
        id: sw.id,
        sentenceId: sw.sentenceId,
        wordId: sw.wordId,
        position: sw.position,
        highlightColor: sw.highlightColor || undefined,
        createdAt: sw.createdAt,
        word: {
          id: sw.word.id,
          name: sw.word.name,
          grammaticalClass: sw.word.grammaticalClass,
          category: sw.word.category,
          translations: sw.word.translations,
          confidence: sw.word.confidence,
          isSaved: sw.word.isSaved,
          frequency: sw.word.frequency,
          vaultId: sw.word.vaultId,
          createdAt: sw.word.createdAt,
        },
      })),
    };
  } catch (error) {
    console.error("Erro ao buscar frase:", error);
    throw error;
  }
}

// Atualizar frase
export async function updateSentence(
  sentenceId: number,
  data: CreateSentenceData
): Promise<Sentence> {
  try {
    console.log("=== INÍCIO updateSentence ===");
    console.log("ID da frase:", sentenceId);
    console.log("Dados recebidos:", data);

    // Verificar se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Verificar se a frase existe e pertence ao usuário
    const existingSentence = await prisma.sentence.findFirst({
      where: {
        id: sentenceId,
        userId: user.id,
      },
    });

    if (!existingSentence) {
      throw new Error("Frase não encontrada ou não pertence ao usuário");
    }

    // Validar dados
    if (!data.words || data.words.length === 0) {
      throw new Error(
        "É necessário pelo menos uma palavra para atualizar uma frase"
      );
    }

    // Processar palavras - criar novas ou usar existentes
    const processedWords: {
      wordId: number;
      position: number;
      highlightColor?: string;
    }[] = [];

    for (const wordItem of data.words) {
      let wordId: number;

      if (wordItem.wordId) {
        // Palavra existente - verificar se pertence ao usuário
        const existingWord = await prisma.word.findFirst({
          where: {
            id: wordItem.wordId,
            vault: {
              userId: user.id,
            },
          },
        });

        if (!existingWord) {
          throw new Error(
            `Palavra com ID ${wordItem.wordId} não foi encontrada ou não pertence ao usuário`
          );
        }

        wordId = wordItem.wordId;
      } else if (wordItem.wordData) {
        // Palavra nova - criar um cofre temporário se necessário
        let vault = await prisma.vault.findFirst({
          where: {
            name: "Frase Builder",
            userId: user.id,
          },
        });

        if (!vault) {
          vault = await prisma.vault.create({
            data: {
              name: "Frase Builder",
              userId: user.id,
            },
          });
        }

        // Criar a nova palavra
        const newWord = await prisma.word.create({
          data: {
            name: wordItem.wordData.name,
            grammaticalClass: wordItem.wordData.grammaticalClass,
            translations: wordItem.wordData.translations,
            category: wordItem.wordData.category || null,
            vaultId: vault.id,
            confidence: 1,
            isSaved: false, // Marcada como não salva pois é temporária
            frequency: 0,
          },
        });

        wordId = newWord.id;
      } else {
        throw new Error("Cada palavra deve ter wordId ou wordData");
      }

      processedWords.push({
        wordId,
        position: wordItem.position,
        highlightColor: wordItem.highlightColor,
      });
    }

    // Atualizar a frase
    const sentence = await prisma.sentence.update({
      where: {
        id: sentenceId,
      },
      data: {
        title: data.title?.trim() || null,
        notes: data.notes?.trim() || null,
        updatedAt: new Date(),
      },
    });

    // Deletar palavras existentes da frase
    await prisma.sentenceWord.deleteMany({
      where: {
        sentenceId: sentenceId,
      },
    });

    // Adicionar as novas palavras à frase
    const sentenceWords = await Promise.all(
      processedWords.map((wordData) =>
        prisma.sentenceWord.create({
          data: {
            sentenceId: sentence.id,
            wordId: wordData.wordId,
            position: wordData.position,
            highlightColor: wordData.highlightColor || null,
          },
          include: {
            word: {
              include: {
                vault: true,
              },
            },
          },
        })
      )
    );

    // Revalidar cache
    revalidatePath("/home/sentence-builder");

    console.log("Frase atualizada com sucesso:", sentence.id);
    console.log("=== FIM updateSentence - SUCESSO ===");

    return {
      id: sentence.id,
      title: sentence.title || undefined,
      notes: sentence.notes || undefined,
      createdAt: sentence.createdAt,
      updatedAt: sentence.updatedAt,
      userId: sentence.userId,
      words: sentenceWords.map((sw) => ({
        id: sw.id,
        sentenceId: sw.sentenceId,
        wordId: sw.wordId,
        position: sw.position,
        highlightColor: sw.highlightColor || undefined,
        createdAt: sw.createdAt,
        word: {
          id: sw.word.id,
          name: sw.word.name,
          grammaticalClass: sw.word.grammaticalClass,
          category: sw.word.category,
          translations: sw.word.translations,
          confidence: sw.word.confidence,
          isSaved: sw.word.isSaved,
          frequency: sw.word.frequency,
          vaultId: sw.word.vaultId,
          createdAt: sw.word.createdAt,
        },
      })),
    };
  } catch (error) {
    console.error("Erro ao atualizar frase:", error);
    throw error;
  }
}

// Deletar frase
export async function deleteSentence(sentenceId: number): Promise<void> {
  try {
    console.log("=== INÍCIO deleteSentence ===");
    console.log("ID da frase:", sentenceId);

    // Verificar se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Verificar se a frase existe e pertence ao usuário
    const sentence = await prisma.sentence.findFirst({
      where: {
        id: sentenceId,
        userId: user.id,
      },
    });

    if (!sentence) {
      throw new Error("Frase não encontrada ou não pertence ao usuário");
    }

    // Deletar a frase (as palavras serão deletadas automaticamente devido ao onDelete: Cascade)
    await prisma.sentence.delete({
      where: {
        id: sentenceId,
      },
    });

    // Revalidar cache
    revalidatePath("/home/sentence-builder");

    console.log("Frase deletada com sucesso");
    console.log("=== FIM deleteSentence - SUCESSO ===");
  } catch (error) {
    console.error("Erro ao deletar frase:", error);
    throw error;
  }
}

// Buscar palavras para usar no sentence builder
export async function getWordsForSentenceBuilder(): Promise<Word[]> {
  try {
    console.log("=== INÍCIO getWordsForSentenceBuilder ===");

    // Verificar se o usuário está autenticado
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Buscar todas as palavras dos vaults do usuário
    const words = await prisma.word.findMany({
      where: {
        vault: {
          userId: user.id,
        },
      },
      include: {
        vault: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    console.log(`Encontradas ${words.length} palavras para sentence builder`);
    console.log("=== FIM getWordsForSentenceBuilder - SUCESSO ===");

    return words.map((word) => ({
      id: word.id,
      name: word.name,
      grammaticalClass: word.grammaticalClass,
      category: word.category,
      translations: word.translations,
      confidence: word.confidence,
      isSaved: word.isSaved,
      frequency: word.frequency,
      vaultId: word.vaultId,
      createdAt: word.createdAt,
    }));
  } catch (error) {
    console.error("Erro ao buscar palavras para sentence builder:", error);
    throw error;
  }
}
