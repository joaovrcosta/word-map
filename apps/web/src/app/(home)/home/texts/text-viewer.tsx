"use client";

import { useState, useEffect, useLayoutEffect, useMemo, useCallback, memo, useRef } from "react";
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
import { Edit2, Save, X } from "lucide-react";
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
import { normalizeToken } from "@/lib/word-matching";
import { useTextSelection } from "@/hooks/use-text-selection";
import { TextSelectionPopover } from "@/components/text-selection-popover";
import {
  ReadingWordPanel,
  ReadingWordToken,
  readingWordMark,
  findSavedReadingWord,
  playWordAudio,
  type SelectedReadingWord,
} from "@/components/reading-word-panel";
import type { ContextualizePayload } from "@/lib/contextualize-client";
import { buildReadingContext } from "@/lib/reading-context";
import {
  paginateReading,
  resolveReadingPage,
  splitParagraphs,
} from "@/lib/reading-pages";
import {
  PageSpeechControls,
  usePageSpeech,
} from "@/components/page-speech-button";
import { paintSpokenWord, type SpokenRange } from "@/lib/spoken-word";
import { cn } from "@/lib/utils";

interface TextViewerProps {
  text: Text;
  onTextUpdated?: () => void;
  onSave?: (title: string, content: string) => Promise<void>;
  canEdit?: boolean;
  paged?: boolean;
  initialPageIndex?: number;
  initialParagraphIndex?: number;
  onReadingPosition?: (position: {
    pageIndex: number;
    paragraphIndex: number;
  }) => void;
  sourceTitle?: string;
  sourceKind?: "book" | "text";
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
  paged = false,
  initialPageIndex = 0,
  initialParagraphIndex = 0,
  onReadingPosition,
  sourceTitle,
  sourceKind = "text",
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
  const [pageIndex, setPageIndex] = useState(initialPageIndex);
  const pages = useMemo(
    () => (paged ? paginateReading(editContent) : []),
    [paged, editContent]
  );
  const speechText = paged && !isEditing ? (pages[pageIndex]?.text ?? "") : "";
  const speech = usePageSpeech(speechText);
  const spokenRangeRef = useRef<SpokenRange | null>(null);
  const spokenRootRef = useRef<HTMLDivElement | null>(null);
  const setReadingRoot = useCallback(
    (node: HTMLDivElement | null) => {
      spokenRootRef.current = node;
      selectionContainerRef(node);
    },
    [selectionContainerRef]
  );
  useEffect(() => {
    return speech.subscribe((range) => {
      spokenRangeRef.current = range;
      const root = spokenRootRef.current;
      if (!root) return;
      paintSpokenWord(root, range);
    });
  }, [speech.subscribe]);
  useLayoutEffect(() => {
    const root = spokenRootRef.current;
    if (!root) return;
    paintSpokenWord(root, spokenRangeRef.current);
  });
  const appliedPositionKey = useRef("");

  useEffect(() => {
    if (!paged) return;
    const key = `${initialPageIndex}:${initialParagraphIndex}:${editContent}`;
    if (appliedPositionKey.current === key) return;
    appliedPositionKey.current = key;
    setPageIndex(
      resolveReadingPage(paginateReading(editContent), initialParagraphIndex, initialPageIndex)
    );
  }, [paged, editContent, initialPageIndex, initialParagraphIndex]);

  useEffect(() => {
    if (!paged || pages.length === 0) return;
    const paragraphIndex = pages[pageIndex]?.slices[0]?.paragraphIndex ?? 0;
    onReadingPosition?.({ pageIndex, paragraphIndex });
  }, [paged, pageIndex, pages, onReadingPosition]);

  useEffect(() => {
    if (!paged || !selection) return;
    const clean = selection.text.replace(/\s+/g, " ").trim();
    if (!clean) return;
    setSelectedWord({ surface: clean, clean });
  }, [paged, selection]);

  useEffect(() => {
    if (!paged) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditing) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      setPageIndex((current) => {
        if (event.key === "ArrowRight") {
          return Math.min(pages.length - 1, current + 1);
        }
        return Math.max(0, current - 1);
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paged, isEditing, pages.length]);

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
    (surface: string, clean: string, occurrence: number) => {
      setSelectedWord({
        surface,
        clean,
        occurrence,
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
      notes?: string | null,
      origin?: {
        sentence?: string | null;
        sourceTitle?: string | null;
        sourceKind?: "book" | "text" | "manual";
      }
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
          origin,
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
      origin?: {
        sentence?: string | null;
        sourceTitle?: string | null;
        sourceKind?: "book" | "text" | "manual";
      };
    }) => {
      await handleAddWordToVault(
        payload.vaultId,
        payload.word,
        payload.translations,
        payload.grammaticalClass,
        payload.confidence,
        payload.notes,
        payload.origin
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
  const handleRemoveWordFromVault = async (
    word: string,
    vaultId: number,
    wordId?: number
  ) => {
    try {
      setIsAddingWord(true);

      await removeWordFromVault(word, vaultId, wordId);

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
      const nodes: React.ReactNode[] = [];
      const seen = new Map<string, number>();
      const takeOccurrence = (clean: string) => {
        const occurrence = seen.get(clean) ?? 0;
        seen.set(clean, occurrence + 1);
        return occurrence;
      };
      const vaultWords = new Set(
        foundWords.map((item) => normalizeToken(item.word))
      );

      let last = 0;
      let tokenKey = 0;
      for (const match of content.matchAll(/\S+/g)) {
        const start = match.index ?? 0;
        if (start > last) nodes.push(content.slice(last, start));
        const surface = match[0];
        const end = start + surface.length;
        const clean = normalizeToken(surface);
        const inVault = vaultWords.has(clean);
        const clickable = inVault || (surface.trim().length > 2 && clean.length >= 3);

        if (clickable && clean) {
          const occurrence = takeOccurrence(clean);
          const mark = readingWordMark(selectedWord, clean, occurrence);
          nodes.push(
            <ReadingWordToken
              key={`chunk-${chunkIndex}-${tokenKey++}`}
              surface={surface}
              inVault={inVault}
              selected={mark === "selected"}
              similar={mark === "similar"}
              wordStart={start}
              wordEnd={end}
              onClick={() => handleSelectWord(surface, clean, occurrence)}
            />
          );
        } else {
          nodes.push(
            <span
              key={`chunk-${chunkIndex}-${tokenKey++}`}
              data-word-start={start}
              data-word-end={end}
            >
              {surface}
            </span>
          );
        }
        last = end;
      }
      if (last < content.length) nodes.push(content.slice(last));
      return nodes;
    },
    [foundWords, selectedWord, handleSelectWord]
  );

  // Memoizar a renderização do texto interativo
  const visibleText =
    paged && !isEditing ? (pages[pageIndex]?.text ?? "") : editContent;
  const contextPayload = useMemo<ContextualizePayload | null>(() => {
    if (!paged || isEditing || !selectedWord) return null;
    const built = buildReadingContext({
      paragraphs: splitParagraphs(editContent),
      pages,
      pageIndex,
      span: selectedWord.clean,
    });
    if (!built.ok) return null;
    return {
      span: built.span,
      sentence: built.sentence,
      paragraph: built.paragraph,
      previousParagraph: built.previousParagraph,
      ...(selectedWord.saved ? { wordId: selectedWord.saved.id } : {}),
    };
  }, [paged, isEditing, selectedWord, editContent, pages, pageIndex]);

  const renderInteractiveText = useMemo(() => {
    return renderTextChunk(visibleText);
  }, [visibleText, renderTextChunk]);

  const readingProgress =
    pages.length <= 1 ? 0 : (pageIndex / (pages.length - 1)) * 100;

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
      <div
        className={cn(
          "min-w-0 flex-1 px-6 sm:px-8 lg:px-16 xl:px-24 2xl:px-32",
          paged && !isEditing && "flex flex-col"
        )}
      >
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
              ref={setReadingRoot}
              data-text-selection-container
              className="select-text text-[20px] leading-[2.05] text-zinc-900 dark:text-zinc-100"
            >
              {renderInteractiveText}
            </div>
          </div>
        ) : (
          <div
            ref={setReadingRoot}
            data-text-selection-container
            className="select-text text-[20px] leading-[2.05] text-zinc-900 dark:text-zinc-100"
          >
            {renderInteractiveText}
          </div>
        )}
        {paged && !isEditing && pages.length > 0 && (
          <div className={cn("h-28 shrink-0", selectedWord && "max-lg:h-4")} />
        )}
      </div>
      <div
        className={`hidden lg:block lg:shrink-0 ${
          selectedWord ? "lg:w-[var(--reading-panel-width)]" : "lg:w-0"
        }`}
      />
      <ReadingWordPanel
        selected={selectedWord}
        sourceText={visibleText}
        userVaults={userVaults}
        wordInfo={selectedWord ? wordInfoMap[selectedWord.clean] : null}
        isLoadingInfo={!!selectedWord && loadingWords.has(selectedWord.clean)}
        isSaving={isAddingWord}
        autoTranslateWordPreview={autoTranslateWordPreview}
        showContextualize={paged && !isEditing}
        contextPayload={contextPayload}
        originSource={{
          title: sourceTitle || text.title,
          kind: sourceKind,
        }}
        onClose={() => setSelectedWord(null)}
        onSave={handlePanelSave}
        onUpdate={handlePanelUpdate}
        onRemove={handleRemoveWordFromVault}
      />
      </div>

      {paged && !isEditing && pages.length > 0 && (
        <div
          className={cn(
            "fixed top-14 left-0 z-20 h-1.5 bg-black/10 dark:bg-white/10",
            selectedWord ? "right-0 lg:right-[var(--reading-panel-width)]" : "right-0"
          )}
          role="progressbar"
          aria-valuenow={Math.round(readingProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da leitura"
        >
          <div
            className="h-full bg-[#24c875] transition-[width] duration-300"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      )}

      {paged && !isEditing && pages.length > 0 && (
        <div
          className={cn(
            "fixed bottom-5 z-30 flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col items-center",
            selectedWord
              ? "left-1/2 lg:left-[calc((100%-var(--reading-panel-width))/2)]"
              : "left-1/2"
          )}
        >
          <div className="rounded-full border border-white/10 bg-[#181818] px-4 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
            <PageSpeechControls
              status={speech.status}
              canPlay={speech.canPlay}
              onToggle={speech.toggle}
              canNext={pageIndex < pages.length - 1}
              canPrevious={pageIndex > 0}
              onNextPart={() =>
                setPageIndex((current) => Math.min(pages.length - 1, current + 1))
              }
              onPreviousPart={() =>
                setPageIndex((current) => Math.max(0, current - 1))
              }
            />
          </div>
        </div>
      )}

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
