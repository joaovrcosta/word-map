"use client";

import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import {
  Text,
  checkTextWords,
  createWord,
  getVaults,
  updateText,
  updateWord,
  removeWordFromVault,
} from "@/actions/actions";
import { Vault, Word } from "@/actions/actions";
import {
  Edit2,
  Save,
  X,
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

interface TextViewerProps {
  text: Text;
  onTextUpdated?: () => void;
  onSave?: (title: string, content: string) => Promise<void>;
  canEdit?: boolean;
}

interface FoundWord {
  word: string;
  vaultInfo: Vault[];
}

// Componente memoizado para palavras encontradas
export function TextViewer({
  text,
  onTextUpdated,
  onSave,
  canEdit = true,
}: TextViewerProps) {
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userVaults, setUserVaults] = useState<Vault[]>([]);
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [selectedWord, setSelectedWord] = useState<SelectedReadingWord | null>(
    null
  );
  const [wordInfoMap, setWordInfoMap] = useState<Record<string, any>>({});
  const [loadingWords, setLoadingWords] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(text.title);
  const [editContent, setEditContent] = useState(text.content);
  const [isSaving, setIsSaving] = useState(false);
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
  const { toast } = useToast();
  useLoadUserSettings();
  const autoTranslateWordPreview = useUserSettingsStore(
    (state) => state.settings.autoTranslateWordPreview
  );
  const { containerRef: selectionContainerRef, selection, clearSelection } =
    useTextSelection();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Carregar palavras encontradas e vaults do usuário
        const [words, vaults] = await Promise.all([
          checkTextWords(text.content),
          getVaults(),
        ]);

        setFoundWords(words);
        setUserVaults(vaults);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [text.content]);

  // Função para salvar edições do texto
  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);

      if (onSave) {
        await onSave(editTitle, editContent);
      } else {
        await updateText(text.id, editTitle, editContent);
      }

      toast({
        title: "Texto atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });

      setIsEditing(false);

      // Atualizar o texto local
      text.title = editTitle;
      text.content = editContent;

      // Recarregar dados para atualizar as palavras encontradas
      const words = await checkTextWords(editContent);
      setFoundWords(words);

      // Chamar callback de atualização se fornecido
      if (onTextUpdated) {
        onTextUpdated();
      }
    } catch (error) {
      console.error("Erro ao salvar texto:", error);
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
    setEditTitle(text.title);
    setEditContent(text.content);
    setIsEditing(false);
  };

  const fetchWordInfo = useCallback(async (word: string) => {
    return lookupWordInfo(word);
  }, []);

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
          prev ? { ...prev, saved: findSavedReadingWord(words, clean) } : prev
        );
      }
    },
    [editContent, selectedWord?.clean]
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

        // Preparar dados da palavra
        const wordData = {
          name: word,
          grammaticalClass: normalizeGrammaticalClass(
            wordInfo?.meanings?.[0]?.partOfSpeech
          ),
          translations: wordInfo?.meanings?.[0]?.definitions
            ?.slice(0, 2)
            ?.map((def: any) => def.definition) || [word],
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
    [editContent, toast, wordInfoMap, fetchWordInfo]
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

        const wordData = {
          name: word,
          grammaticalClass,
          translations,
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
    [toast, refreshFoundWords]
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
      await handleAddWordToVault(
        payload.vaultId,
        payload.word,
        payload.translations,
        payload.grammaticalClass,
        payload.confidence,
        payload.notes
      );
    },
    [handleAddWordToVault]
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

  // Função para abrir modal de edição
  const handleEditWord = (vaultWord: any) => {
    setEditingWord(vaultWord);
    setEditTranslations(vaultWord.translations.join(", "));
    setEditGrammaticalClass(vaultWord.grammaticalClass);
    setEditConfidence(vaultWord.confidence);
    setIsEditDialogOpen(true);
  };

  // Função para salvar edição da palavra
  const handleSaveWordEdit = async () => {
    if (!editingWord) return;

    try {
      setIsSaving(true);
      const translations = editTranslations
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await updateWord(editingWord.id, {
        translations,
        grammaticalClass: editGrammaticalClass,
        confidence: editConfidence,
      });

      toast({
        title: "Sucesso",
        description: "Palavra atualizada com sucesso!",
      });

      // Recarregar dados
      const words = await checkTextWords(editContent);
      setFoundWords(words);

      setIsEditDialogOpen(false);
      setEditingWord(null);
    } catch (error) {
      console.error("Erro ao atualizar palavra:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar palavra",
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
        title: "Sucesso",
        description: `Palavra "${word}" removida do vault!`,
      });

      // Recarregar dados
      await refreshFoundWords();
      setSelectedWord((prev) =>
        prev ? { ...prev, saved: undefined } : prev
      );
    } catch (error) {
      console.error("Erro ao remover palavra:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover palavra do vault",
        variant: "destructive",
      });
    } finally {
      setIsAddingWord(false);
    }
  };

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
                  <span key={`chunk-${chunkIndex}-${index}-${wordIndex}`}>
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
    return renderTextChunk(editContent);
  }, [editContent, renderTextChunk]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Analisando texto...</p>
      </div>
    );
  }

  return (
    <div>
    <div className="flex items-start">
      <div className="min-w-0 flex-1 px-6 sm:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="h-10 border-[#e5e5e5] text-xl font-medium shadow-none"
              placeholder="Título do texto"
            />
          ) : (
            <h1 className="truncate text-[22px] font-medium leading-tight text-[#333] dark:text-white">
              {text.title}
            </h1>
          )}

          <div className="flex shrink-0 items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  size="sm"
                  variant="ghost"
                  className="gap-2 text-[#777]"
                >
                  {isSaving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current"></div>
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar
                </Button>
                <Button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  size="sm"
                  variant="ghost"
                  className="gap-2 text-[#777]"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </>
            ) : canEdit ? (
              <Button
                onClick={() => setIsEditing(true)}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-[#b0b0b0] hover:text-[#555] dark:hover:text-white"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-6">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-64 resize-none text-base leading-8 shadow-none"
              placeholder="Digite ou cole o texto aqui..."
            />
            <div
              ref={selectionContainerRef}
              data-text-selection-container
              className="select-text text-[20px] leading-[2.05] text-zinc-900 dark:text-zinc-100"
            >
              {renderInteractiveText}
            </div>
          </div>
        ) : (
          <div
            ref={selectionContainerRef}
            data-text-selection-container
            className="select-text text-[20px] leading-[2.05] text-zinc-900 dark:text-zinc-100"
          >
            {renderInteractiveText}
          </div>
        )}
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

      {/* Modal de edição de palavra */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Palavra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Significados:</label>
              <Textarea
                value={editTranslations}
                onChange={(e) => setEditTranslations(e.target.value)}
                placeholder="Digite os significados separados por vírgula"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Classe Gramatical:</label>
              <Input
                value={editGrammaticalClass}
                onChange={(e) => setEditGrammaticalClass(e.target.value)}
                placeholder="ex: substantivo, verbo, adjetivo, frase, phrasal-verb"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nível de Confiança:</label>
              <Input
                type="number"
                min="1"
                max="5"
                value={editConfidence}
                onChange={(e) => setEditConfidence(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveWordEdit} disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
