import { useState, useEffect, useRef } from "react";
import { useWords } from "@/hooks/use-words";
import { WordItem, ExternalWord, Word, Sentence } from "./types";
import {
  getUserSentences,
  createSentence,
  updateSentence,
  deleteSentence,
  getWordsForSentenceBuilder,
  type Sentence as DatabaseSentence,
} from "@/actions/sentences";

export function useSentenceBuilder() {
  // Estados principais
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredWords, setFilteredWords] = useState<(Word | ExternalWord)[]>(
    []
  );
  const [sentenceWords, setSentenceWords] = useState<WordItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [savedSentences, setSavedSentences] = useState<Sentence[]>([]);
  const [selectedSentence, setSelectedSentence] = useState<Sentence | null>(
    null
  );
  const [isLoadingSentences, setIsLoadingSentences] = useState(false);
  const [isSavingSentence, setIsSavingSentence] = useState(false);

  // Estados para drag and drop
  const [draggedWord, setDraggedWord] = useState<WordItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);

  // Estados para menu de contexto
  const [contextMenuWordId, setContextMenuWordId] = useState<string | null>(
    null
  );
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Estados para sistema de menções
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionPosition, setMentionPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);

  // Dados externos
  const { words, isLoading } = useWords();

  // Refs
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Carregar frases salvas do banco de dados
  const loadSavedSentences = async () => {
    try {
      setIsLoadingSentences(true);
      const sentences = await getUserSentences();

      // Converter frases do banco para o formato do componente
      const convertedSentences: Sentence[] = sentences.map((dbSentence) => ({
        id: `sentence-${dbSentence.id}`,
        words: dbSentence.words.map((sw) => ({
          id: `${sw.wordId}-${sw.id}`,
          word: sw.word,
          position: sw.position,
          highlightColor: sw.highlightColor,
        })),
        notes: dbSentence.notes || "",
        createdAt: dbSentence.createdAt,
      }));

      setSavedSentences(convertedSentences);
    } catch (error) {
      console.error("Erro ao carregar frases:", error);
    } finally {
      setIsLoadingSentences(false);
    }
  };

  // Salvar frase atual no banco de dados
  const saveCurrentSentence = async (title?: string) => {
    if (sentenceWords.length === 0) return;

    try {
      setIsSavingSentence(true);

      const sentenceData = {
        title: title || `Frase ${new Date().toLocaleString()}`,
        notes: notes,
        words: sentenceWords.map((wordItem, index) => {
          // Se a palavra tem ID numérico, é uma palavra existente
          if (typeof wordItem.word.id === "number" && wordItem.word.id > 0) {
            return {
              wordId: wordItem.word.id,
              position: index,
              highlightColor: wordItem.highlightColor,
            };
          } else {
            // Se não tem ID numérico válido, é uma palavra externa que precisa ser criada
            return {
              wordData: {
                name: wordItem.word.name,
                grammaticalClass: wordItem.word.grammaticalClass,
                translations: wordItem.word.translations,
                category: wordItem.word.category,
              },
              position: index,
              highlightColor: wordItem.highlightColor,
            };
          }
        }),
      };

      await createSentence(sentenceData);

      // Recarregar frases salvas
      await loadSavedSentences();

      // Limpar frase atual
      setSentenceWords([]);
      setNotes("");
      setSelectedSentence(null);
      setIsEditingNotes(false);
    } catch (error) {
      console.error("Erro ao salvar frase:", error);
      throw error;
    } finally {
      setIsSavingSentence(false);
    }
  };

  // Carregar uma frase salva
  const loadSentence = (sentence: Sentence) => {
    setSentenceWords(sentence.words);
    setNotes(sentence.notes);
    setSelectedSentence(sentence);
  };

  // Deletar frase do banco de dados
  const deleteSavedSentence = async (sentenceId: string) => {
    try {
      const dbSentenceId = parseInt(sentenceId.replace("sentence-", ""));
      await deleteSentence(dbSentenceId);

      // Recarregar frases salvas
      await loadSavedSentences();

      // Se a frase deletada estava selecionada, limpar
      if (selectedSentence?.id === sentenceId) {
        setSentenceWords([]);
        setNotes("");
        setSelectedSentence(null);
        setIsEditingNotes(false);
      }
    } catch (error) {
      console.error("Erro ao deletar frase:", error);
      throw error;
    }
  };

  // Carregar frases na inicialização
  useEffect(() => {
    loadSavedSentences();
  }, []);

  return {
    // Estados principais
    searchTerm,
    setSearchTerm,
    filteredWords,
    setFilteredWords,
    sentenceWords,
    setSentenceWords,
    notes,
    setNotes,
    isSearching,
    setIsSearching,
    isTranslating,
    setIsTranslating,
    savedSentences,
    setSavedSentences,
    selectedSentence,
    setSelectedSentence,
    isLoadingSentences,
    isSavingSentence,

    // Estados para drag and drop
    draggedWord,
    setDraggedWord,
    dragOverIndex,
    setDragOverIndex,
    editingWordId,
    setEditingWordId,

    // Estados para menu de contexto
    contextMenuWordId,
    setContextMenuWordId,
    contextMenuPosition,
    setContextMenuPosition,

    // Estados para sistema de menções
    isEditingNotes,
    setIsEditingNotes,
    showMentionDropdown,
    setShowMentionDropdown,
    mentionPosition,
    setMentionPosition,
    mentionQuery,
    setMentionQuery,
    cursorPosition,
    setCursorPosition,

    // Dados externos
    words,
    isLoading,

    // Refs
    dropZoneRef,
    textareaRef,

    // Funções do banco de dados
    loadSavedSentences,
    saveCurrentSentence,
    loadSentence,
    deleteSavedSentence,
  };
}
