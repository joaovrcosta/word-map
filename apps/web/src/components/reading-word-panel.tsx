"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Volume2,
  X,
  Trash2,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { translateDefinitions } from "@/lib/translate";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractRelatedSentences, splitTokenEdges } from "@/lib/word-matching";
import { getPassageExplanation } from "@/actions/passage-explanations";
import {
  listWordOrigins,
  type WordOriginEntry,
} from "@/actions/word-origins";
import { formatOriginDate, type WordOriginKind } from "@/lib/word-origin";
import {
  requestContextualize,
  type ContextualizePayload,
} from "@/lib/contextualize-client";
import { requestSuggestTranslation } from "@/lib/suggest-translation-client";
import { normalizeGrammaticalClass } from "@/lib/dictionary";
import { GrammarClassLink } from "@/components/grammar-class-link";
import type { Vault } from "@/actions/actions";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type SavedReadingWord = {
  id: number;
  name: string;
  vaultId: number;
  vaultName: string;
  translations: string[];
  grammaticalClass: string;
  confidence: number;
  notes: string | null;
};

export type SelectedReadingWord = {
  surface: string;
  clean: string;
  occurrence?: number;
  saved?: SavedReadingWord;
};

export function readingWordMark(
  selected: { clean: string; occurrence?: number } | null,
  clean: string,
  occurrence: number
): "selected" | "similar" | null {
  if (!selected || selected.occurrence == null || selected.clean !== clean) {
    return null;
  }
  return selected.occurrence === occurrence ? "selected" : "similar";
}

export function findSavedReadingWord(
  foundWords: Array<{
    word: string;
    vaultInfo: Array<{
      id: number;
      name: string;
      words: Array<{
        id: number;
        name: string;
        translations: string[];
        grammaticalClass: string;
        confidence: number;
        notes?: string | null;
        vaultId: number;
      }>;
    }>;
  }>,
  clean: string
): SavedReadingWord | undefined {
  const match = foundWords.find(
    (item) => item.word.toLowerCase() === clean.toLowerCase()
  );
  if (!match) return undefined;

  const vault = match.vaultInfo[0];
  const word =
    vault?.words.find((item) => item.name.toLowerCase() === clean.toLowerCase()) ??
    vault?.words[0];
  if (!vault || !word) return undefined;

  return {
    id: word.id,
    name: word.name,
    vaultId: vault.id,
    vaultName: vault.name,
    translations: word.translations,
    grammaticalClass: word.grammaticalClass,
    confidence: word.confidence,
    notes: word.notes ?? null,
  };
}

type DictionaryWordInfo = {
  word?: string;
  phonetic?: string;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string }>;
  }>;
};

type SavePayload = {
  vaultId: number;
  word: string;
  translations: string[];
  grammaticalClass: string;
  confidence: number;
  notes: string | null;
  origin?: {
    sentence?: string | null;
    sourceTitle?: string | null;
    sourceKind?: WordOriginKind;
  };
};

interface ReadingWordPanelProps {
  selected: SelectedReadingWord | null;
  sourceText: string;
  userVaults: Vault[];
  wordInfo?: DictionaryWordInfo | null;
  isLoadingInfo?: boolean;
  isSaving?: boolean;
  autoTranslateWordPreview?: boolean;
  onClose: () => void;
  onSave: (payload: SavePayload) => Promise<void> | void;
  onUpdate: (
    wordId: number,
    data: {
      translations?: string[];
      grammaticalClass?: string;
      confidence?: number;
      notes?: string | null;
      origin?: {
        sentence?: string | null;
        sourceTitle?: string | null;
        sourceKind?: WordOriginKind;
      };
    }
  ) => Promise<void> | void;
  onRemove: (
    word: string,
    vaultId: number,
    wordId?: number
  ) => Promise<void> | void;
  extras?: ReactNode;
  docked?: boolean;
  showContextualize?: boolean;
  contextPayload?: ContextualizePayload | null;
  originSource?: { title: string; kind: WordOriginKind } | null;
}

const READING_PANEL_WIDTH_KEY = "wordmap-reading-panel-width";
const READING_PANEL_DEFAULT_WIDTH = 300;

export function clampReadingPanelWidth(value: number, viewport = 1280) {
  const max = Math.max(
    READING_PANEL_DEFAULT_WIDTH,
    Math.min(640, viewport - 360)
  );
  if (!Number.isFinite(value)) return READING_PANEL_DEFAULT_WIDTH;
  return Math.min(max, Math.max(260, Math.round(value)));
}

function applyReadingPanelWidth(value: number, viewport?: number) {
  const width = clampReadingPanelWidth(
    value,
    viewport ?? (typeof window === "undefined" ? 1280 : window.innerWidth)
  );
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty(
      "--reading-panel-width",
      `${width}px`
    );
  }
  return width;
}

const LEVEL_COLORS = [
  "bg-[#ff4b4b] text-white",
  "bg-[#ff9600] text-white",
  "bg-[#ffc800] text-[#3c3c3c]",
  "bg-[#58cc02] text-white",
];

export function playWordAudio(word: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.8;
  utterance.onend = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

function collectCandidateMeanings(
  wordInfo?: DictionaryWordInfo | null
): string[] {
  if (!wordInfo?.meanings?.length) return [];

  const found: string[] = [];
  for (const meaning of wordInfo.meanings) {
    for (const definition of meaning.definitions ?? []) {
      const raw = definition.definition?.trim();
      if (!raw) continue;
      const short =
        raw.replace(/^\([^)]*\)\s*/, "").split(/[.;]/)[0]?.trim() ?? "";
      if (short.length < 2 || short.length > 80) continue;
      const key = short.toLowerCase();
      if (found.some((item) => item.toLowerCase() === key)) continue;
      found.push(short);
      if (found.length >= 10) return found;
    }
  }
  return found;
}

function hasMeaning(list: string[], value: string): boolean {
  return list.some((item) => item.toLowerCase() === value.trim().toLowerCase());
}

export function ReadingWordToken({
  surface,
  selected,
  similar,
  inVault,
  onClick,
}: {
  surface: string;
  selected: boolean;
  similar?: boolean;
  inVault: boolean;
  onClick: () => void;
}) {
  const marked = Boolean(inVault || similar || selected);
  const { leading, core, trailing } = splitTokenEdges(surface);

  return (
    <button type="button" onClick={onClick} className="inline bg-transparent p-0">
      {leading}
      <span
        className={cn(
          "mx-px rounded-[3px] !text-zinc-900 dark:!text-zinc-100",
          marked
            ? "inline-block px-1.5 py-0.5 leading-none"
            : "inline px-[2px] py-[1px]",
          inVault &&
          "bg-[#ddf4ff] text-[#1cb0f6] dark:bg-[#1cb0f6]/25 dark:text-[#7ed0fb]",
          !marked && "hover:bg-black/[0.04] dark:hover:bg-white/10",
          similar &&
          "bg-[#edf9df] !text-zinc-900 dark:bg-[#58cc02]/15 dark:!text-zinc-100",
          selected &&
          "relative bg-[#58cc02] !text-white shadow-none dark:bg-[#58cc02] dark:!text-white dark:shadow-none"
        )}
      >
        {selected && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 -translate-y-[calc(100%-1px)] border-x-[6px] border-b-[7px] border-x-transparent border-b-[#58cc02]"
          />
        )}
        {core}
      </span>
      {trailing}
    </button>
  );
}

export function ReadingWordPanel({
  selected,
  sourceText,
  userVaults,
  wordInfo,
  isLoadingInfo,
  isSaving,
  autoTranslateWordPreview,
  onClose,
  onSave,
  onUpdate,
  onRemove,
  extras,
  showContextualize = false,
  contextPayload = null,
  originSource = null,
}: ReadingWordPanelProps) {
  const [onClient, setOnClient] = useState(false);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [snapOffscreen, setSnapOffscreen] = useState(false);
  const closeTimerRef = useRef<number>(0);
  const [selectedMeanings, setSelectedMeanings] = useState<string[]>([]);
  const [customMeaning, setCustomMeaning] = useState("");
  const [candidateMeanings, setCandidateMeanings] = useState<string[]>([]);
  const [isTranslatingMeanings, setIsTranslatingMeanings] = useState(false);
  const [notes, setNotes] = useState("");
  const [vaultId, setVaultId] = useState<string>("");
  const [explanation, setExplanation] = useState<string | null>(null);
  const [suggestedTranslation, setSuggestedTranslation] = useState<string | null>(
    null
  );
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionLocked, setSuggestionLocked] = useState(false);
  const suggestingRef = useRef(false);
  const suggestWordKeyRef = useRef<string | number | null>(null);
  const originsFetchRef = useRef(0);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [origins, setOrigins] = useState<WordOriginEntry[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const panelWidthRef = useRef(READING_PANEL_DEFAULT_WIDTH);

  const selectedKey = selected?.saved?.id ?? selected?.clean ?? null;
  suggestWordKeyRef.current = selectedKey;

  const savedOriginKey = selected?.saved
    ? `${selected.saved.id}:${selected.saved.translations.join("\n")}`
    : "";

  useEffect(() => {
    const wordId = selected?.saved?.id;
    const fetchId = ++originsFetchRef.current;
    if (!wordId) {
      setOrigins([]);
      return;
    }
    void listWordOrigins(wordId)
      .then((rows) => {
        if (originsFetchRef.current === fetchId) setOrigins(rows);
      })
      .catch(() => {
        if (originsFetchRef.current === fetchId) setOrigins([]);
      });
  }, [savedOriginKey, selected?.saved?.id]);

  useEffect(() => {
    if (!selectedKey) return;
    setExpanded(false);
    setSnapOffscreen(true);
    setOpen(false);
    const frame = requestAnimationFrame(() => {
      setSnapOffscreen(false);
      requestAnimationFrame(() => setOpen(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedKey]);

  useEffect(() => {
    setOnClient(true);
    const stored = Number(window.localStorage.getItem(READING_PANEL_WIDTH_KEY));
    if (Number.isFinite(stored) && stored > 0) {
      panelWidthRef.current = applyReadingPanelWidth(stored);
    }
    return () => {
      window.clearTimeout(closeTimerRef.current);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const suggestedClass = normalizeGrammaticalClass(
    selected?.saved?.grammaticalClass ||
    wordInfo?.meanings?.[0]?.partOfSpeech
  );

  const passageSpan = contextPayload?.span ?? "";
  const passageSentence = contextPayload?.sentence ?? "";

  useEffect(() => {
    if (!showContextualize || !passageSpan || !passageSentence) {
      setExplanation(null);
      setSuggestedTranslation(null);
      setExplanationError(null);
      return;
    }

    let cancelled = false;
    setExplanation(null);
    setSuggestedTranslation(null);
    setExplanationError(null);
    void getPassageExplanation(passageSpan, passageSentence).then((saved) => {
      if (cancelled || !saved) return;
      setExplanation(saved.explanation);
      setSuggestedTranslation(saved.translation);
    });

    return () => {
      cancelled = true;
    };
  }, [showContextualize, passageSpan, passageSentence]);

  const handleContextualize = () => {
    if (!contextPayload) return;
    setIsExplaining(true);
    setExplanationError(null);
    void requestContextualize(contextPayload)
      .then((result) => {
        setExplanation(result.explanation);
        setSuggestedTranslation(result.translation);
      })
      .catch((error: unknown) => {
        setExplanationError(
          error instanceof Error
            ? error.message
            : "Não foi possível explicar este trecho."
        );
      })
      .finally(() => {
        setIsExplaining(false);
      });
  };

  useEffect(() => {
    suggestingRef.current = false;
    setSuggestionLocked(false);
    setSuggestError(null);
  }, [selected?.clean, selected?.saved?.id]);

  useEffect(() => {
    setSelectedMeanings(selected?.saved?.translations ?? []);
    setCustomMeaning("");
    setSuggestError(null);
    setNotes(selected?.saved?.notes ?? "");
    setVaultId(
      selected?.saved
        ? String(selected.saved.vaultId)
        : userVaults[0]
          ? String(userVaults[0].id)
          : ""
    );
  }, [selected?.clean, selected?.saved?.id, userVaults, selected?.saved?.translations]);

  useEffect(() => {
    const raw = collectCandidateMeanings(wordInfo);
    if (!raw.length) {
      setCandidateMeanings([]);
      return;
    }

    if (autoTranslateWordPreview) {
      setCandidateMeanings(raw);
      return;
    }

    let cancelled = false;
    setIsTranslatingMeanings(true);
    translateDefinitions(raw)
      .then((translated) => {
        if (cancelled) return;
        const unique: string[] = [];
        for (const item of translated) {
          const value = item.trim();
          if (!value || hasMeaning(unique, value)) continue;
          unique.push(value);
        }
        setCandidateMeanings(unique);
      })
      .finally(() => {
        if (!cancelled) setIsTranslatingMeanings(false);
      });

    return () => {
      cancelled = true;
    };
  }, [wordInfo, autoTranslateWordPreview, selected?.clean]);

  const relatedPhrases = useMemo(() => {
    if (!selected) return [];
    return extractRelatedSentences(sourceText, selected.clean);
  }, [sourceText, selected]);

  const partOfSpeechBadges = useMemo(() => {
    if (selected?.saved?.grammaticalClass) {
      return [selected.saved.grammaticalClass];
    }
    const parts =
      wordInfo?.meanings
        ?.map((meaningItem) => meaningItem.partOfSpeech)
        .filter((part): part is string => Boolean(part)) ?? [];
    return [...new Set(parts)].slice(0, 3);
  }, [selected, wordInfo]);

  const confidence = selected?.saved?.confidence ?? 0;

  const currentOrigin = () => {
    const sentence = contextPayload?.sentence ?? null;
    return {
      sentence,
      sourceTitle: originSource?.title ?? null,
      sourceKind: (originSource?.kind ??
        (sentence ? "text" : "manual")) as WordOriginKind,
    };
  };

  const persistMeanings = async (translations: string[], confidence?: number) => {
    if (!selected) return;
    const origin = currentOrigin();
    if (selected.saved) {
      const wordId = selected.saved.id;
      await onUpdate(wordId, {
        translations,
        confidence,
        origin,
      });
      const fetchId = ++originsFetchRef.current;
      const rows = await listWordOrigins(wordId);
      if (
        originsFetchRef.current === fetchId &&
        suggestWordKeyRef.current === wordId
      ) {
        setOrigins(rows);
      }
      return;
    }
    if (!vaultId) return;
    await onSave({
      vaultId: Number(vaultId),
      word: selected.clean,
      translations: translations.length ? translations : [selected.clean],
      grammaticalClass: suggestedClass,
      confidence: confidence ?? 1,
      notes: notes.trim() || null,
      origin,
    });
  };

  const handleSuggestTranslation = async () => {
    const wordKey = selectedKey;
    if (!selected || wordKey == null || suggestingRef.current || suggestionLocked) {
      return;
    }
    suggestingRef.current = true;
    setIsSuggesting(true);
    setSuggestError(null);
    let locked = false;
    try {
      const translation = await requestSuggestTranslation({
        word: selected.clean,
        sentence: contextPayload?.sentence,
        wordId: selected.saved?.id,
      });
      if (suggestWordKeyRef.current !== wordKey) return;
      setCustomMeaning(translation);
      setSuggestionLocked(true);
      locked = true;
    } catch (error) {
      setSuggestError(
        error instanceof Error
          ? error.message
          : "Não foi possível sugerir uma tradução."
      );
    } finally {
      setIsSuggesting(false);
      if (!locked && suggestWordKeyRef.current === wordKey) {
        suggestingRef.current = false;
      }
    }
  };

  const handleAddMeaning = async (value: string) => {
    const meaning = value.trim();
    if (!selected || !meaning || hasMeaning(selectedMeanings, meaning)) return;
    const next = [...selectedMeanings, meaning];
    setSelectedMeanings(next);
    setCustomMeaning("");
    await persistMeanings(next);
  };

  const handleRemoveMeaning = async (value: string) => {
    const next = selectedMeanings.filter(
      (item) => item.toLowerCase() !== value.toLowerCase()
    );
    setSelectedMeanings(next);
    if (selected?.saved) {
      await persistMeanings(next);
    }
  };

  const handleConfidence = async (level: number) => {
    if (!selected) return;
    if (selected.saved) {
      await onUpdate(selected.saved.id, { confidence: level });
      return;
    }
    await persistMeanings(selectedMeanings, level);
  };

  const handleNotesBlur = async () => {
    if (!selected?.saved) return;
    await onUpdate(selected.saved.id, { notes: notes.trim() || null });
  };

  const availableMeanings = candidateMeanings.filter(
    (item) => !hasMeaning(selectedMeanings, item)
  );

  const handleClose = () => {
    setOpen(false);
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => onClose(), 320);
  };

  if (!selected) return null;

  const panel = (
    <aside
      className={cn(
        "flex min-h-0 flex-col overflow-hidden border-[#ececec] bg-white dark:border-[#373e47] dark:bg-[#22272e] will-change-transform",
        snapOffscreen
          ? "transition-none"
          : "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        open
          ? "max-lg:translate-y-0 lg:translate-x-0"
          : "pointer-events-none max-lg:translate-y-[110%] lg:translate-x-full",
        "fixed z-[80]",
        "max-lg:inset-x-3 max-lg:bottom-3 max-lg:top-auto max-lg:h-fit max-lg:w-auto max-lg:rounded-2xl max-lg:border max-lg:shadow-2xl",
        expanded
          ? "max-lg:max-h-[min(72dvh,560px)]"
          : "max-lg:max-h-none",
        "lg:inset-x-auto lg:top-12 lg:right-0 lg:bottom-auto lg:h-[calc(100dvh-3rem)] lg:w-[var(--reading-panel-width)] lg:max-h-none lg:rounded-none lg:border-l lg:shadow-none"
      )}
      onTransitionEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.propertyName !== "transform") return;
        if (!open) {
          window.clearTimeout(closeTimerRef.current);
          onClose();
        }
      }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Ajustar largura do painel"
        aria-valuemin={260}
        aria-valuemax={640}
        aria-valuenow={panelWidthRef.current}
        tabIndex={0}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          const startX = event.clientX;
          const startWidth = panelWidthRef.current;
          const handle = event.currentTarget;
          handle.setPointerCapture(event.pointerId);
          setIsResizing(true);
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";

          const resizeTo = (clientX: number, persist: boolean) => {
            const next = applyReadingPanelWidth(startWidth + (startX - clientX));
            panelWidthRef.current = next;
            handle.setAttribute("aria-valuenow", String(next));
            if (persist) {
              window.localStorage.setItem(READING_PANEL_WIDTH_KEY, String(next));
            }
          };
          const onMove = (moveEvent: PointerEvent) => resizeTo(moveEvent.clientX, false);
          const onUp = (upEvent: PointerEvent) => {
            resizeTo(upEvent.clientX, true);
            setIsResizing(false);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            handle.removeEventListener("pointermove", onMove);
            handle.removeEventListener("pointerup", onUp);
            handle.removeEventListener("pointercancel", onUp);
          };
          handle.addEventListener("pointermove", onMove);
          handle.addEventListener("pointerup", onUp);
          handle.addEventListener("pointercancel", onUp);
        }}
        onKeyDown={(event) => {
          const step =
            event.key === "ArrowLeft" ? 16 : event.key === "ArrowRight" ? -16 : 0;
          if (!step) return;
          event.preventDefault();
          const next = applyReadingPanelWidth(panelWidthRef.current + step);
          panelWidthRef.current = next;
          event.currentTarget.setAttribute("aria-valuenow", String(next));
          window.localStorage.setItem(READING_PANEL_WIDTH_KEY, String(next));
        }}
        className={cn(
          "absolute inset-y-0 left-0 z-20 hidden w-3 cursor-col-resize touch-none lg:block",
          "after:absolute after:inset-y-0 after:left-0 after:w-0.5 after:bg-[#58cc02] after:opacity-0 hover:after:opacity-80",
          isResizing && "after:opacity-100"
        )}
      />
      <div className="flex items-center justify-between gap-2 border-b border-[#ececec] px-3 py-2.5 dark:border-gray-800 max-lg:border-b-0">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => playWordAudio(selected.clean)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center text-[#888] hover:text-[#333] dark:hover:text-white"
            aria-label={`Ouvir ${selected.clean}`}
          >
            <Volume2 className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-[20px] font-medium text-[#333] dark:text-white">
              {selected.clean}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {selected.saved && (
            <span className="inline-flex h-7 w-7 items-center justify-center text-[#58cc02]">
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </span>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-[#b0b0b0] hover:bg-black/5 hover:text-[#555] dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Fechar painel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-3 pb-1 lg:hidden">
        <div className="relative">
          <Textarea
            value={customMeaning}
            onChange={(e) => setCustomMeaning(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleAddMeaning(customMeaning);
              }
            }}
            placeholder="Digite um novo significado aqui"
            className="min-h-16 resize-none rounded-md border-[#e5e5e5] pr-9 text-[13px] shadow-none dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            type="button"
            aria-label="Sugerir tradução"
            disabled={!selected || isSuggesting || suggestionLocked}
            onClick={() => void handleSuggestTranslation()}
            className="absolute right-1.5 bottom-1.5 inline-flex h-7 w-7 items-center justify-center rounded text-violet-600 hover:bg-violet-50 disabled:opacity-40 dark:text-violet-300 dark:hover:bg-violet-400/10"
          >
            <Sparkles
              className={cn("h-3.5 w-3.5", isSuggesting && "animate-pulse")}
            />
          </button>
        </div>
        {suggestError ? (
          <p className="mt-1 text-[12px] text-red-500 lg:hidden">{suggestError}</p>
        ) : null}
      </div>

      <div
        className={cn(
          "min-h-0 overflow-y-auto px-3 py-3 lg:flex-1",
          expanded
            ? "max-lg:max-h-[min(52dvh,420px)]"
            : "hidden lg:block"
        )}
      >
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {confidence > 0 && (
            <span
              className={cn(
                "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                LEVEL_COLORS[Math.min(confidence, 4) - 1]
              )}
            >
              {confidence}
            </span>
          )}
          {partOfSpeechBadges.map((badge) => (
            <GrammarClassLink
              key={badge}
              value={badge}
              className="rounded bg-[#f3f3f3] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#888] hover:bg-[#eef6ff] hover:text-[#1cb0f6] dark:bg-white/10 dark:text-gray-400 dark:hover:text-sky-300"
            />
          ))}
        </div>

        <p className="hidden text-[11px] font-medium text-[#8a8a8a] lg:block dark:text-zinc-400">
          Salvar significado
        </p>
        {selectedMeanings.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {selectedMeanings.map((item) => (
              <div
                key={item}
                className="flex items-start justify-between gap-2 rounded bg-[#eef6ff] px-2.5 py-1.5 text-[13px] text-[#2b7de9] dark:bg-sky-950 dark:text-sky-300"
              >
                <span className="min-w-0 leading-snug">{item}</span>
                <button
                  type="button"
                  onClick={() => void handleRemoveMeaning(item)}
                  className="shrink-0 text-[#2b7de9]/70 hover:text-[#2b7de9]"
                  aria-label={`Remover ${item}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-1.5 hidden items-center gap-1 lg:flex">
          <div className="relative min-w-0 flex-1">
            <Input
              value={customMeaning}
              onChange={(e) => setCustomMeaning(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAddMeaning(customMeaning);
                }
              }}
              placeholder="Digite um novo significado aqui"
              className="h-9 rounded-md border-[#e5e5e5] pr-9 text-[13px] shadow-none dark:border-gray-700 dark:bg-gray-900"
            />
            <button
              type="button"
              aria-label="Sugerir tradução"
              disabled={!selected || isSuggesting || suggestionLocked}
              onClick={() => void handleSuggestTranslation()}
              className="absolute top-1/2 right-1 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-violet-600 hover:bg-violet-50 disabled:opacity-40 dark:text-violet-300 dark:hover:bg-violet-400/10"
            >
              <Sparkles
                className={cn("h-3.5 w-3.5", isSuggesting && "animate-pulse")}
              />
            </button>
          </div>
          <button
            type="button"
            disabled={!customMeaning.trim() || isSaving || !vaultId}
            onClick={() => void handleAddMeaning(customMeaning)}
            className="inline-flex h-9 w-8 shrink-0 items-center justify-center text-[#b0b0b0] hover:text-[#2b7de9] disabled:opacity-30"
            aria-label="Adicionar significado"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {suggestError ? (
          <p className="mt-1 hidden text-[12px] text-red-500 lg:block">
            {suggestError}
          </p>
        ) : null}
        {!selected.saved && userVaults.length > 1 && (
          <Select value={vaultId} onValueChange={setVaultId}>
            <SelectTrigger className="mt-1.5 h-8 w-full rounded-md border-[#e5e5e5] text-[12px] shadow-none dark:border-gray-700 dark:bg-gray-900">
              <SelectValue placeholder="Vault" />
            </SelectTrigger>
            <SelectContent>
              {userVaults.map((vault) => (
                <SelectItem key={vault.id} value={String(vault.id)}>
                  {vault.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {origins.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-medium text-[#8a8a8a] dark:text-zinc-400">
              Origem dos significados
            </p>
            <ol className="mt-2 space-y-3">
              {origins.map((item) => (
                <li
                  key={item.id}
                  className="border-l-2 border-[#1cb0f6] pl-3"
                >
                  <p className="text-[11px] text-[#8a8a8a] dark:text-zinc-400">
                    {formatOriginDate(item.createdAt)}
                    {" · "}
                    {item.sourceTitle || "No vault"}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-[#555] dark:text-zinc-300">
                    {item.sentence || "Adicionada no vault"}
                  </p>
                  <p className="mt-0.5 text-[13px] font-medium text-[#2b7de9] dark:text-sky-300">
                    Significado: {item.meaning}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}

        <p className="mt-4 text-[11px] font-medium text-[#8a8a8a] dark:text-zinc-400">
          Significados populares
        </p>
        {(isLoadingInfo || isTranslatingMeanings) && (
          <div className="mt-2 space-y-2">
            <Skeleton className="h-3 w-[78%] rounded-full bg-black/5 dark:bg-white/8" />
            <Skeleton className="h-3 w-[62%] rounded-full bg-black/5 dark:bg-white/8" />
            <Skeleton className="h-3 w-[48%] rounded-full bg-black/5 dark:bg-white/8" />
          </div>
        )}
        {!isLoadingInfo &&
          !isTranslatingMeanings &&
          availableMeanings.length === 0 && (
            <p className="mt-2 text-[12px] text-[#aaa]">
              Nenhum significado sugerido.
            </p>
          )}
        {!isLoadingInfo && !isTranslatingMeanings && (
          <div className="mt-1.5 space-y-1">
            {availableMeanings.map((item) => (
              <button
                key={item}
                type="button"
                disabled={isSaving || !vaultId}
                onClick={() => void handleAddMeaning(item)}
                className="flex w-full items-center justify-between gap-2 rounded bg-[#f6f6f6] px-2.5 py-1.5 text-left text-[13px] text-[#2b7de9] hover:bg-[#eef6ff] disabled:opacity-40 dark:bg-zinc-800 dark:text-sky-300 dark:hover:bg-zinc-700"
              >
                <span className="line-clamp-2 min-w-0 leading-snug">{item}</span>
                <Plus className="h-3.5 w-3.5 shrink-0 text-[#b0b0b0]" />
              </button>
            ))}
          </div>
        )}

        {relatedPhrases.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-medium text-[#8a8a8a] dark:text-zinc-400">
              Frases relacionadas
            </p>
            <ul className="mt-1 space-y-0.5">
              {relatedPhrases.slice(0, 4).map((phrase) => (
                <li
                  key={phrase}
                  className="px-0.5 py-1 text-[12px] leading-snug text-[#666] dark:text-zinc-300"
                >
                  {phrase}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showContextualize &&
          (explanation && !isExplaining ? (
            <div className="mt-4 rounded-md border border-violet-200 bg-violet-50/80 px-3 py-2.5 dark:border-violet-400/15 dark:bg-violet-400/[0.06]">
              <button
                type="button"
                onClick={handleContextualize}
                disabled={!contextPayload}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-violet-700 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Explicar contexto
              </button>
              <p className="mt-2 text-[13px] leading-snug text-[#444] dark:text-zinc-300">
                {explanation}
              </p>
              {suggestedTranslation ? (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-violet-700/80 dark:text-violet-300/80">
                      Tradução
                    </p>
                    <p className="text-[13px] font-medium leading-snug text-[#3c3c3c] dark:text-white">
                      {suggestedTranslation}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={
                      isSaving ||
                      !selected ||
                      hasMeaning(selectedMeanings, suggestedTranslation)
                    }
                    onClick={() => void handleAddMeaning(suggestedTranslation)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 text-[12px] font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-60 dark:bg-zinc-900 dark:text-violet-300"
                  >
                    {hasMeaning(selectedMeanings, suggestedTranslation) ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                    {hasMeaning(selectedMeanings, suggestedTranslation)
                      ? "Salva"
                      : "Salvar"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleContextualize}
                disabled={!contextPayload || isExplaining}
                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-violet-200 bg-violet-50/80 px-3 py-2 text-[13px] font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-70 dark:border-violet-400/20 dark:bg-violet-400/[0.08] dark:text-violet-300 dark:hover:bg-violet-400/[0.14]"
              >
                <Sparkles
                  className={cn("h-3.5 w-3.5", isExplaining && "ai-sparkle")}
                  aria-hidden
                />
                {isExplaining ? "Explicando..." : "Explicar contexto"}
              </button>
              {explanationError && (
                <p className="mt-2 text-[12px] leading-snug text-rose-700 dark:text-rose-300">
                  {explanationError}
                </p>
              )}
            </div>
          ))}

        {extras}

        <div className="mt-4">
          <p className="text-[11px] font-medium text-[#8a8a8a] dark:text-zinc-400">
            Notas
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => void handleNotesBlur()}
            placeholder="Adicionar nota aqui"
            className="mt-1.5 min-h-20 resize-none rounded-md border-[#e5e5e5] text-[13px] shadow-none dark:border-gray-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full shrink-0 items-center justify-center py-1.5 text-[#8b949e] lg:hidden"
        aria-label={expanded ? "Recolher painel" : "Expandir painel"}
      >
        {expanded ? (
          <ChevronUp className="h-5 w-5" />
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
      </button>

      <div
        className={cn(
          "flex shrink-0 items-center gap-2 border-t border-[#ececec] px-3 py-2.5 dark:border-gray-800",
          selected.saved ? "justify-between" : "justify-center",
          !expanded && "hidden lg:flex"
        )}
      >
        {selected.saved && (
          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              onRemove(
                selected.saved!.name,
                selected.saved!.vaultId,
                selected.saved!.id
              )
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-zinc-500 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40 dark:text-zinc-400 dark:hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remover
          </button>
        )}
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4].map((level) => (
            <button
              key={level}
              type="button"
              disabled={isSaving || (!selected.saved && !vaultId)}
              onClick={() => void handleConfidence(level)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-medium",
                confidence === level
                  ? LEVEL_COLORS[level - 1]
                  : "bg-[#f4f4f4] text-[#999] dark:bg-gray-800 dark:text-gray-400"
              )}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );

  if (!onClient) return panel;
  return createPortal(panel, document.body);
}
