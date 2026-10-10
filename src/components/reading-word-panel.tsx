"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Volume2, X, Trash2, Plus, Check, ChevronDown, ChevronUp } from "lucide-react";
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
import { extractRelatedSentences } from "@/lib/word-matching";
import { normalizeGrammaticalClass } from "@/lib/dictionary";
import type { Vault } from "@/actions/actions";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export type SavedReadingWord = {
  id: number;
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
  saved?: SavedReadingWord;
};

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
    }
  ) => Promise<void> | void;
  onRemove: (word: string, vaultId: number) => Promise<void> | void;
  extras?: ReactNode;
  docked?: boolean;
}

const LEVEL_COLORS = [
  "bg-[#ff4b4b] text-white",
  "bg-[#ff9600] text-white",
  "bg-[#ffc800] text-[#3c3c3c]",
  "bg-[#58cc02] text-white",
];

export function playWordAudio(word: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.8;
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
  inVault,
  onClick,
}: {
  surface: string;
  selected: boolean;
  inVault: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mx-px inline rounded-[3px] px-[2px] py-[1px] !text-zinc-900 dark:!text-zinc-100",
        inVault &&
          "bg-[#ddf4ff] text-[#1cb0f6] dark:bg-[#1cb0f6]/25 dark:text-[#7ed0fb]",
        !inVault && "hover:bg-black/[0.04] dark:hover:bg-white/10",
        selected &&
          "bg-[#e8e8e8] shadow-[inset_0_0_0_1px_#cfcfcf] dark:bg-zinc-600 dark:text-zinc-50 dark:shadow-[inset_0_0_0_1px_#888]"
      )}
    >
      {surface}
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

  const selectedKey = selected?.saved?.id ?? selected?.clean ?? null;

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
    return () => window.clearTimeout(closeTimerRef.current);
  }, []);

  const suggestedClass = normalizeGrammaticalClass(
    selected?.saved?.grammaticalClass ||
      wordInfo?.meanings?.[0]?.partOfSpeech
  );

  useEffect(() => {
    setSelectedMeanings(selected?.saved?.translations ?? []);
    setCustomMeaning("");
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
        .filter(Boolean) ?? [];
    return [...new Set(parts)].slice(0, 3);
  }, [selected, wordInfo]);

  const confidence = selected?.saved?.confidence ?? 0;

  const persistMeanings = async (translations: string[], confidence?: number) => {
    if (!selected) return;
    if (selected.saved) {
      await onUpdate(selected.saved.id, {
        translations,
        confidence,
      });
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
    });
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
        "lg:inset-x-auto lg:top-12 lg:right-0 lg:bottom-auto lg:h-[calc(100dvh-3rem)] lg:w-[300px] lg:max-h-none lg:rounded-none lg:border-l lg:shadow-none"
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
                <p className="truncate text-[15px] font-medium text-[#333] dark:text-white">
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
              className="min-h-16 resize-none rounded-md border-[#e5e5e5] text-[13px] shadow-none dark:border-gray-700 dark:bg-gray-900"
            />
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
                <span
                  key={badge}
                  className="rounded bg-[#f3f3f3] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#888] dark:bg-white/10 dark:text-gray-400"
                >
                  {badge}
                </span>
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
                className="h-9 rounded-md border-[#e5e5e5] text-[13px] shadow-none dark:border-gray-700 dark:bg-gray-900"
              />
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
                  onRemove(selected.clean, selected.saved!.vaultId)
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
