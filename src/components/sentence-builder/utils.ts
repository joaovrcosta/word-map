import { WordItem, ExternalWord, Word, HighlightColor } from "./types";
import { HIGHLIGHT_COLORS, LINE_HEIGHT, MAX_SEARCH_RESULTS } from "./constants";

// Função para obter classes CSS da cor
export const getColorClasses = (color: string): string => {
  const colorConfig = HIGHLIGHT_COLORS.find((c) => c.value === color);
  return colorConfig
    ? `${colorConfig.bg} ${colorConfig.text}`
    : "bg-gray-100 text-gray-800";
};

// Função para filtrar palavras baseado na pesquisa
export const filterWords = (
  words: Word[] | undefined,
  searchTerm: string
): (Word | ExternalWord)[] => {
  if (!words || searchTerm.length < 2) {
    return [];
  }

  // Filtrar palavras do vault atual
  const vaultWords = words
    .filter(
      (word) =>
        word.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.translations.some((translation) =>
          translation.toLowerCase().includes(searchTerm.toLowerCase())
        )
    )
    .slice(0, MAX_SEARCH_RESULTS);

  // Adicionar palavra externa se não encontrada no vault
  const searchLower = searchTerm.toLowerCase();
  const isInVault = vaultWords.some(
    (word) => word.name.toLowerCase() === searchLower
  );

  let externalWord: ExternalWord | null = null;
  if (!isInVault && searchTerm.length >= 2) {
    externalWord = {
      id: `external-${searchTerm}`,
      name: searchTerm,
      translations: [],
      grammaticalClass: "substantivo", // Default
      isExternal: true,
    };
  }

  const allResults: (Word | ExternalWord)[] = [...vaultWords];
  if (externalWord) {
    allResults.push(externalWord);
  }

  return allResults;
};

// Função para renderizar texto com menções destacadas
export const renderTextWithMentions = (text: string) => {
  if (!text) return [];

  // Regex para encontrar @palavra
  const regex = /@(\w+)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (index % 2 === 1) {
      // É uma palavra após @
      return {
        type: "mention",
        content: part,
        key: index,
      };
    }
    return {
      type: "text",
      content: part,
      key: index,
    };
  });
};

// Função para preparar dados para o dropdown de menção
export const getMentionOptions = (
  sentenceWords: WordItem[],
  mentionQuery: string
) => {
  return sentenceWords
    .sort((a, b) => a.position - b.position)
    .filter((wordItem) =>
      wordItem.word.name.toLowerCase().includes(mentionQuery.toLowerCase())
    )
    .map((wordItem) => ({
      name: wordItem.word.name,
      translations: wordItem.word.translations.join(", "),
    }));
};

// Função para calcular posição do dropdown de menção
export const calculateMentionPosition = (
  textarea: HTMLTextAreaElement,
  cursorPosition: number,
  notes: string
) => {
  const rect = textarea.getBoundingClientRect();
  const lines = notes.substring(0, cursorPosition).split("\n").length - 1;

  return {
    x: rect.left,
    y: rect.top + lines * LINE_HEIGHT + LINE_HEIGHT,
  };
};

// Função para gerar texto da frase
export const generateSentenceText = (sentenceWords: WordItem[]): string => {
  return sentenceWords
    .sort((a, b) => a.position - b.position)
    .map((w) => w.word.name)
    .join(" ");
};
