import { WordItem, ExternalWord, Word } from "./types";
import { translateToPortuguese } from "@/lib/translate";

// Adicionar palavra à frase
export const addWordToSentence = async (
  word: Word | ExternalWord,
  sentenceWords: WordItem[],
  setIsTranslating: (value: boolean) => void
): Promise<WordItem> => {
  let wordToAdd: Word;

  // Se for palavra externa, traduzir automaticamente
  if ("isExternal" in word && word.isExternal) {
    setIsTranslating(true);
    try {
      const translation = await translateToPortuguese(word.name);
      wordToAdd = {
        id: parseInt(word.id.replace("external-", "")),
        name: word.name,
        translations: [translation],
        grammaticalClass: word.grammaticalClass,
        category: null,
        confidence: 1,
        isSaved: false,
        frequency: 0,
        vaultId: 0, // Será definido quando salvar
        createdAt: new Date(),
      };
    } catch (error) {
      console.warn("Erro ao traduzir palavra:", error);
      // Usar palavra sem tradução se falhar
      wordToAdd = {
        id: parseInt(word.id.replace("external-", "")),
        name: word.name,
        translations: [],
        grammaticalClass: word.grammaticalClass,
        category: null,
        confidence: 1,
        isSaved: false,
        frequency: 0,
        vaultId: 0,
        createdAt: new Date(),
      };
    }
    setIsTranslating(false);
  } else {
    wordToAdd = word as Word;
  }

  const newWordItem: WordItem = {
    id: `${wordToAdd.id}-${Date.now()}`,
    word: wordToAdd,
    position: sentenceWords.length,
  };

  return newWordItem;
};

// Remover palavra da frase
export const removeWordFromSentence = (
  wordId: string,
  sentenceWords: WordItem[]
): WordItem[] => {
  const filtered = sentenceWords.filter((w) => w.id !== wordId);
  // Reordenar posições
  return filtered.map((w, index) => ({ ...w, position: index }));
};

// Alterar cor de destaque
export const changeWordColor = (
  wordId: string,
  color: string,
  sentenceWords: WordItem[]
): WordItem[] => {
  return sentenceWords.map((word) =>
    word.id === wordId ? { ...word, highlightColor: color } : word
  );
};

// Reordenar palavras na frase
export const reorderWords = (
  draggedWord: WordItem,
  dropIndex: number,
  sentenceWords: WordItem[]
): WordItem[] => {
  const sortedWords = [...sentenceWords].sort(
    (a, b) => a.position - b.position
  );
  const draggedIndex = sortedWords.findIndex((w) => w.id === draggedWord.id);

  if (draggedIndex === -1) return sentenceWords;

  // Remove o item arrastado
  const [draggedItem] = sortedWords.splice(draggedIndex, 1);

  // Insere na nova posição
  sortedWords.splice(dropIndex, 0, draggedItem);

  // Reordena as posições
  return sortedWords.map((word, index) => ({
    ...word,
    position: index,
  }));
};
