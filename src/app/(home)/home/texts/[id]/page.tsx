"use client";

import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Calendar,
  Clock,
  BookOpen,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Text,
  updateText,
  checkTextWords,
  getVaults,
  createWord,
  getTextById,
  removeWordFromVault,
  updateWord,
} from "@/actions/actions";
import { Vault } from "@/actions/actions";
import { translateDefinitions, translateWordInfoPreview } from "@/lib/translate";
import { lookupWordInfo } from "@/lib/dictionary-client";
import { normalizeGrammaticalClass } from "@/lib/dictionary";
import { useLoadUserSettings } from "@/hooks/use-user-settings";
import useUserSettingsStore from "@/store/userSettingsStore";
import {
  createHighlightMarker,
  escapeRegExp,
  normalizeToken,
  parseHighlightMarker,
  splitHighlightParts,
} from "@/lib/word-matching";
import { useTextSelection } from "@/hooks/use-text-selection";
import { TextSelectionPopover } from "@/components/text-selection-popover";
import {
  ReadingWordPanel,
  ReadingWordToken,
  findSavedReadingWord,
  playWordAudio,
  type SelectedReadingWord,
} from "@/components/reading-word-panel";

interface FoundWord {
  word: string;
  vaultInfo: Vault[];
}


// Componente memoizado para o dialog de edição de palavras
const EditWordDialog = memo(
  ({
    isOpen,
    onOpenChange,
    editingWord,
    editTranslations,
    editGrammaticalClass,
    editConfidence,
    onTranslationsChange,
    onGrammaticalClassChange,
    onConfidenceChange,
    onSave,
    onCancel,
    isSaving,
  }: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    editingWord: {
      id: number;
      name: string;
      translations: string[];
      grammaticalClass: string;
      confidence: number;
    } | null;
    editTranslations: string;
    editGrammaticalClass: string;
    editConfidence: number;
    onTranslationsChange: (value: string) => void;
    onGrammaticalClassChange: (value: string) => void;
    onConfidenceChange: (value: number) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
  }) => {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Palavra</DialogTitle>
          </DialogHeader>
          {editingWord && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Palavra
                </label>
                <Input
                  value={editingWord.name}
                  disabled
                  className="mt-1 bg-gray-50 dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Significados (separados por vírgula)
                </label>
                <Textarea
                  value={editTranslations}
                  onChange={(e) => onTranslationsChange(e.target.value)}
                  className="mt-1"
                  placeholder="Ex: casa, lar, residência"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Classe Gramatical
                </label>
                <Input
                  value={editGrammaticalClass}
                  onChange={(e) => onGrammaticalClassChange(e.target.value)}
                  className="mt-1"
                  placeholder="Ex: substantivo, verbo, adjetivo, frase, phrasal-verb"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nível de Confiança (1-5)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={editConfidence}
                  onChange={(e) => onConfidenceChange(parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={onSave}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }
);

EditWordDialog.displayName = "EditWordDialog";

// Hook personalizado para gerenciar visualização de texto em chunks
const useTextChunks = (content: string, chunkSize: number = 1000) => {
  const [visibleChunks, setVisibleChunks] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const chunks = useMemo(() => {
    if (!content) return [];
    const words = content.split(/(\s+)/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(""));
    }

    return chunks;
  }, [content, chunkSize]);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const element = event.currentTarget;
        if (!element) return;

        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;

        // Verificar se os valores são válidos
        if (scrollHeight <= clientHeight) return;

        // Calcular quais chunks devem estar visíveis
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
        const totalChunks = chunks.length;
        const visibleRange = Math.ceil(totalChunks * 0.3); // Mostrar 30% dos chunks

        const startChunk = Math.max(
          0,
          Math.floor(scrollPercentage * totalChunks) -
            Math.floor(visibleRange / 2)
        );
        const endChunk = Math.min(totalChunks - 1, startChunk + visibleRange);

        const newVisibleChunks = Array.from(
          { length: endChunk - startChunk + 1 },
          (_, i) => startChunk + i
        );

        if (
          JSON.stringify(newVisibleChunks) !== JSON.stringify(visibleChunks)
        ) {
          setIsLoading(true);
          setVisibleChunks(newVisibleChunks);

          // Simular um pequeno delay para evitar travamentos
          setTimeout(() => setIsLoading(false), 50);
        }
      }, 100); // Debounce de 100ms
    },
    [chunks.length, visibleChunks]
  );

  useEffect(() => {
    // Inicializar com os primeiros chunks visíveis
    const initialChunks = Math.min(3, chunks.length);
    setVisibleChunks(Array.from({ length: initialChunks }, (_, i) => i));
  }, [chunks.length]);

  return {
    chunks,
    visibleChunks,
    isLoading,
    handleScroll,
  };
};

export default function TextPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  useLoadUserSettings();
  const autoTranslateWordPreview = useUserSettingsStore(
    (state) => state.settings.autoTranslateWordPreview
  );

  const [text, setText] = useState<Text | null>(null);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [userVaults, setUserVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [wordInfoMap, setWordInfoMap] = useState<Record<string, any>>({});
  const [loadingWords, setLoadingWords] = useState<Set<string>>(new Set());
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [selectedWord, setSelectedWord] = useState<SelectedReadingWord | null>(
    null
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const [editingWord, setEditingWord] = useState<{
    id: number;
    name: string;
    translations: string[];
    grammaticalClass: string;
    confidence: number;
  } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTranslations, setEditTranslations] = useState("");
  const [editGrammaticalClass, setEditGrammaticalClass] = useState("");
  const [editConfidence, setEditConfidence] = useState(1);
  const { containerRef: selectionContainerRef, selection, clearSelection } =
    useTextSelection();

  // Usar chunks apenas para textos muito longos (>5000 caracteres)
  const shouldUseChunks = editContent.length > 5000;
  const {
    chunks,
    visibleChunks,
    isLoading: chunksLoading,
    handleScroll,
  } = useTextChunks(shouldUseChunks ? editContent : "", 1000);

  // Carregar dados do texto
  useEffect(() => {
    const loadTextData = async () => {
      if (hasLoaded) return; // Evitar múltiplas execuções

      try {
        setIsLoading(true);

        const textId = parseInt(params.id as string);

        // Buscar texto real da API
        const textData = await getTextById(textId);

        if (!textData) {
          toast({
            title: "Texto não encontrado",
            description:
              "O texto solicitado não foi encontrado ou não pertence a você",
            variant: "destructive",
          });
          return;
        }

        setText(textData);
        setEditTitle(textData.title);
        setEditContent(textData.content);

        // Carregar palavras encontradas e vaults
        const [words, vaults] = await Promise.all([
          checkTextWords(textData.content),
          getVaults(),
        ]);

        setFoundWords(words);
        setUserVaults(vaults);
        setHasLoaded(true);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o texto",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id && !hasLoaded) {
      loadTextData();
    }
  }, [params.id, hasLoaded]);

  // Função para salvar edições
  const handleSaveEdit = async () => {
    if (!text) return;

    try {
      setIsSaving(true);
      await updateText(text.id, editTitle, editContent);

      setText({ ...text, title: editTitle, content: editContent });
      setIsEditing(false);

      // Recarregar palavras encontradas
      const words = await checkTextWords(editContent);
      setFoundWords(words);

      toast({
        title: "Texto atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Função para cancelar edição
  const handleCancelEdit = () => {
    if (text) {
      setEditTitle(text.title);
      setEditContent(text.content);
    }
    setIsEditing(false);
  };

  // Função para abrir modal de edição
  const handleEditWord = useCallback((vaultWord: any) => {
    setEditingWord(vaultWord);
    setEditTranslations(vaultWord.translations.join(", "));
    setEditGrammaticalClass(vaultWord.grammaticalClass);
    setEditConfidence(vaultWord.confidence);
    setIsEditDialogOpen(true);
  }, []);

  // Callbacks otimizados para o dialog de edição
  const handleTranslationsChange = useCallback((value: string) => {
    setEditTranslations(value);
  }, []);

  const handleGrammaticalClassChange = useCallback((value: string) => {
    setEditGrammaticalClass(value);
  }, []);

  const handleConfidenceChange = useCallback((value: number) => {
    setEditConfidence(value);
  }, []);

  const handleDialogCancel = useCallback(() => {
    setIsEditDialogOpen(false);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setIsEditDialogOpen(open);
  }, []);

  // Função para salvar edição da palavra
  const handleSaveWordEdit = async () => {
    if (!editingWord) return;

    try {
      setIsSaving(true);

      const translationsArray = editTranslations
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await updateWord(editingWord.id, {
        translations: translationsArray,
        grammaticalClass: editGrammaticalClass,
        confidence: editConfidence,
      });

      toast({
        title: "Palavra atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });

      setIsEditDialogOpen(false);
      setEditingWord(null);

      // Recarregar dados
      const [words, vaults] = await Promise.all([
        checkTextWords(editContent),
        getVaults(),
      ]);
      setFoundWords(words);
      setUserVaults(vaults);
    } catch (error) {
      console.error("Erro ao salvar palavra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Função para remover palavra do vault
  const handleRemoveWordFromVault = async (word: string, vaultId: number) => {
    try {
      setIsAddingWord(true);

      await removeWordFromVault(word, vaultId);

      toast({
        title: "Palavra removida!",
        description: `"${word}" foi removida do vault`,
      });

      await refreshFoundWords();
      setSelectedWord((prev) =>
        prev ? { ...prev, saved: undefined } : prev
      );
    } catch (error) {
      console.error("Erro ao remover palavra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a palavra",
        variant: "destructive",
      });
    } finally {
      setIsAddingWord(false);
    }
  };

  const fetchWordInfo = useCallback(async (word: string) => {
    return lookupWordInfo(word);
  }, []);

  // Função para renderizar texto interativo
  // Memoizar as funções de callback para evitar re-renderizações desnecessárias
  const handleAddToVault = useCallback(
    async (vaultId: number, word: string) => {
      try {
        setIsAddingWord(true);

        // Buscar informações da palavra
        let wordInfo = wordInfoMap[word];
        if (!wordInfo) {
          wordInfo = await fetchWordInfo(word);
          if (wordInfo) {
            setWordInfoMap((prev) => ({ ...prev, [word]: wordInfo }));
          }
        }

        // Preparar traduções originais
        const originalTranslations = wordInfo?.meanings?.[0]?.definitions
          ?.slice(0, 2)
          ?.map((def: any) => def.definition) || [word];

        // Traduzir as definições para português
        let translatedDefinitions = originalTranslations;
        if (!autoTranslateWordPreview) {
          try {
            translatedDefinitions = await translateDefinitions(
              originalTranslations
            );
          } catch (error) {
            console.warn(
              "Erro ao traduzir definições, usando originais:",
              error
            );
          }
        }

        // Preparar dados da palavra
        const wordData = {
          name: word,
          grammaticalClass:
            normalizeGrammaticalClass(wordInfo?.meanings?.[0]?.partOfSpeech),
          translations: translatedDefinitions,
          confidence: 1,
          vaultId: vaultId,
        };

        await createWord(wordData);

        toast({
          title: "Sucesso",
          description: `Palavra "${word}" adicionada ao vault!`,
        });

        // Recarregar palavras encontradas
        const words = await checkTextWords(editContent);
        setFoundWords(words);
      } catch (error) {
        console.error("Erro ao adicionar palavra:", error);
        toast({
          title: "Erro",
          description: "Erro ao adicionar palavra ao vault",
          variant: "destructive",
        });
      } finally {
        setIsAddingWord(false);
      }
    },
    [editContent, toast, wordInfoMap, fetchWordInfo, autoTranslateWordPreview]
  );

  const refreshFoundWords = useCallback(
    async (selectedClean?: string) => {
      const [words, vaults] = await Promise.all([
        checkTextWords(editContent),
        getVaults(),
      ]);
      setFoundWords(words);
      setUserVaults(vaults);
      const clean = selectedClean ?? selectedWord?.clean;
      if (clean) {
        setSelectedWord((prev) =>
          prev
            ? { ...prev, saved: findSavedReadingWord(words, clean) }
            : prev
        );
      }
    },
    [editContent, selectedWord?.clean]
  );

  const handleAddWordToVault = useCallback(
    async (
      vaultId: number,
      word: string,
      translations: string[],
      grammaticalClass: string,
      confidence: number,
      notes?: string | null
    ) => {
      try {
        setIsAddingWord(true);

        // Traduzir as definições para português
        let translatedDefinitions = translations;
        if (!autoTranslateWordPreview) {
          try {
            translatedDefinitions = await translateDefinitions(translations);
          } catch (error) {
            console.warn(
              "Erro ao traduzir definições, usando originais:",
              error
            );
          }
        }

        const wordData = {
          name: word,
          grammaticalClass,
          translations: translatedDefinitions,
          notes: notes ?? null,
          confidence,
          vaultId,
        };

        await createWord(wordData);
        toast({
          title: "Sucesso",
          description: `Palavra "${word}" adicionada ao vault!`,
        });

        await refreshFoundWords(word);
      } catch (error) {
        console.error("Erro ao adicionar palavra:", error);
        toast({
          title: "Erro",
          description: "Erro ao adicionar palavra ao vault",
          variant: "destructive",
        });
      } finally {
        setIsAddingWord(false);
      }
    },
    [toast, autoTranslateWordPreview, refreshFoundWords]
  );

  const handlePanelSave = useCallback(
    async (payload: {
      vaultId: number;
      word: string;
      translations: string[];
      grammaticalClass: string;
      confidence: number;
      notes: string | null;
    }) => {
      try {
        setIsAddingWord(true);
        await createWord({
          name: payload.word,
          grammaticalClass: payload.grammaticalClass,
          translations: payload.translations,
          notes: payload.notes,
          confidence: payload.confidence,
          vaultId: payload.vaultId,
        });
        toast({
          title: "Sucesso",
          description: `Palavra "${payload.word}" adicionada ao vault!`,
        });
        await refreshFoundWords(payload.word);
      } catch (error) {
        console.error("Erro ao adicionar palavra:", error);
        toast({
          title: "Erro",
          description: "Erro ao adicionar palavra ao vault",
          variant: "destructive",
        });
      } finally {
        setIsAddingWord(false);
      }
    },
    [toast, refreshFoundWords]
  );

  const handlePanelUpdate = useCallback(
    async (
      wordId: number,
      data: {
        translations?: string[];
        grammaticalClass?: string;
        confidence?: number;
        notes?: string | null;
      }
    ) => {
      try {
        setIsAddingWord(true);
        await updateWord(wordId, data);
        await refreshFoundWords();
      } catch (error) {
        console.error("Erro ao atualizar palavra:", error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar a palavra",
          variant: "destructive",
        });
      } finally {
        setIsAddingWord(false);
      }
    },
    [refreshFoundWords, toast]
  );

  const handleFetchWordInfo = useCallback(
    async (word: string) => {
      if (wordInfoMap[word] || loadingWords.has(word)) return;

      setLoadingWords((prev) => new Set(prev).add(word));
      try {
        const info = await fetchWordInfo(word);
        if (!info) {
          setWordInfoMap((prev) => ({
            ...prev,
            [word]: { word, meanings: [] },
          }));
          return;
        }

        const displayInfo = autoTranslateWordPreview
          ? await translateWordInfoPreview(info)
          : info;

        setWordInfoMap((prev) => ({ ...prev, [word]: displayInfo }));
      } catch (error) {
        console.error("Erro ao buscar informações da palavra:", error);
      } finally {
        setLoadingWords((prev) => {
          const newSet = new Set(prev);
          newSet.delete(word);
          return newSet;
        });
      }
    },
    [wordInfoMap, loadingWords, fetchWordInfo, autoTranslateWordPreview]
  );

  const handleSelectWord = useCallback(
    (surface: string, clean: string) => {
      setSelectedWord({
        surface,
        clean,
        saved: findSavedReadingWord(foundWords, clean),
      });
      playWordAudio(clean);
      void handleFetchWordInfo(clean);
    },
    [foundWords, handleFetchWordInfo]
  );

  // Função para renderizar um pedaço de texto
  const renderTextChunk = useCallback(
    (content: string, chunkIndex: number = 0) => {
      [...foundWords]
        .sort((a, b) => b.word.length - a.word.length)
        .forEach(({ word }) => {
          const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi");
          content = content.replace(regex, createHighlightMarker(word));
        });

      const parts = splitHighlightParts(content);

      return parts.map((part, index) => {
        const highlightedWord = parseHighlightMarker(part);
        if (highlightedWord) {
          const wordData = foundWords.find(
            (fw) => fw.word.toLowerCase() === highlightedWord.toLowerCase()
          );

          if (wordData) {
            const clean = normalizeToken(wordData.word);
            return (
              <span key={`chunk-${chunkIndex}-${index}`}>
                <ReadingWordToken
                  surface={highlightedWord}
                  inVault
                  selected={selectedWord?.clean === clean}
                  onClick={() => handleSelectWord(highlightedWord, clean)}
                />
              </span>
            );
          }
        } else if (part.trim() && part.length > 0) {
          const words = part.split(/(\s+)/);
          return words.map((word, wordIndex) => {
            if (word.trim() && word.length > 2) {
              const cleanWordText = normalizeToken(word);
              if (cleanWordText.length >= 3) {
                return (
                  <span
                    className="font-sans text-[20px]"
                    key={`chunk-${chunkIndex}-${index}-${wordIndex}`}
                  >
                    <ReadingWordToken
                      surface={word}
                      inVault={false}
                      selected={selectedWord?.clean === cleanWordText}
                      onClick={() => handleSelectWord(word, cleanWordText)}
                    />
                  </span>
                );
              }
            }
            return word;
          });
        }
        return part;
      });
    },
    [
      foundWords,
      selectedWord?.clean,
      handleSelectWord,
    ]
  );

  // Memoizar a renderização do texto interativo
  const renderInteractiveText = useMemo(() => {
    if (shouldUseChunks && chunks.length > 0) {
      // Renderizar apenas os chunks visíveis
      return visibleChunks.map((chunkIndex) => (
        <div key={chunkIndex} className="text-chunk">
          {renderTextChunk(chunks[chunkIndex], chunkIndex)}
        </div>
      ));
    } else {
      // Renderização normal para textos menores
      return renderTextChunk(editContent);
    }
  }, [shouldUseChunks, chunks, visibleChunks, editContent, renderTextChunk]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto lg:px-6 px-2 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Carregando artigo...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!text) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Texto não encontrado
            </h1>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header fixo */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salvar
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    size="sm"
                    variant="outline"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  variant="outline"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex items-start">
      <div className="min-w-0 flex-1 px-6 py-8 sm:px-8">
        {/* Cabeçalho do artigo */}
        <header className="mb-8">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-3xl font-bold border-2 border-blue-300 focus:border-blue-500 mb-4"
              placeholder="Título do artigo"
            />
          ) : (
            <h1 className="text-[48px] font-sans emibold text-gray-900 dark:text-white mb-4 leading-tight">
              {text.title}
            </h1>
          )}

          <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }).format(new Date(text.createdAt))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                {Math.ceil(editContent.split(" ").length / 200)} min de leitura
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>{editContent.split(" ").length} palavras</span>
            </div>
          </div>

        </header>

        {/* Artigo principal */}
        <article className="prose prose-lg max-w-none dark:prose-invert">
          {isEditing ? (
            <div className="space-y-6">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-96 text-base leading-relaxed resize-none"
                placeholder="Digite ou cole o texto aqui..."
              />

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">
                  Preview com highlights:
                </h3>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
                  <div
                    ref={selectionContainerRef}
                    data-text-selection-container
                    className="leading-relaxed text-gray-900 dark:text-gray-100 select-text"
                  >
                    {renderInteractiveText}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="dark:bg-gray-800 lg:p-0 p-2">
              <div
                className="leading-relaxed text-gray-900 dark:text-gray-100 text-lg"
                onScroll={shouldUseChunks ? handleScroll : undefined}
                style={
                  shouldUseChunks
                    ? { maxHeight: "70vh", overflowY: "auto" }
                    : undefined
                }
              >
                <div
                  ref={selectionContainerRef}
                  data-text-selection-container
                  className="select-text"
                >
                  {renderInteractiveText}
                </div>
                {shouldUseChunks && chunksLoading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">
                      Carregando mais conteúdo...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </article>

        {/* Modal de Edição de Palavra */}
        {selection && (
          <TextSelectionPopover
            selection={selection}
            userVaults={userVaults}
            isAddingWord={isAddingWord}
            autoTranslateWordPreview={autoTranslateWordPreview}
            onSave={handleAddWordToVault}
            onClose={clearSelection}
          />
        )}
        <EditWordDialog
          isOpen={isEditDialogOpen}
          onOpenChange={handleDialogOpenChange}
          editingWord={editingWord}
          editTranslations={editTranslations}
          editGrammaticalClass={editGrammaticalClass}
          editConfidence={editConfidence}
          onTranslationsChange={handleTranslationsChange}
          onGrammaticalClassChange={handleGrammaticalClassChange}
          onConfidenceChange={handleConfidenceChange}
          onSave={handleSaveWordEdit}
          onCancel={handleDialogCancel}
          isSaving={isSaving}
        />
      </div>
      <div
        className={`hidden lg:block lg:shrink-0 ${
          selectedWord ? "lg:w-[300px]" : "lg:w-0"
        }`}
      />
      <ReadingWordPanel
        selected={selectedWord}
        sourceText={editContent}
        userVaults={userVaults}
        wordInfo={selectedWord ? wordInfoMap[selectedWord.clean] : null}
        isLoadingInfo={
          !!selectedWord && loadingWords.has(selectedWord.clean)
        }
        isSaving={isAddingWord}
        autoTranslateWordPreview={autoTranslateWordPreview}
        onClose={() => setSelectedWord(null)}
        onSave={handlePanelSave}
        onUpdate={handlePanelUpdate}
        onRemove={handleRemoveWordFromVault}
      />
      </div>
    </div>
  );
}
