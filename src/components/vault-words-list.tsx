"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRelatedWords,
  incrementWordFrequency,
  removeWordFromVault,
  type Vault,
  type Word,
} from "@/actions/actions";
import { lookupWordInfo } from "@/lib/dictionary-client";
import { useUpdateWord } from "@/hooks/use-words";
import {
  playWordAudio,
  ReadingWordPanel,
  type SelectedReadingWord,
} from "@/components/reading-word-panel";
import { SearchWord } from "@/components/search-word";
import { EditWordDialog } from "@/components/tables/words-table/edit-word-dialog";
import { LinkWordsDialog } from "@/components/tables/words-table/link-words-dialog";
import { cn } from "@/lib/utils";

type DictionaryWordInfo = {
  word?: string;
  phonetic?: string;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string }>;
  }>;
};

function toSelectedWord(word: Word, vaultName: string): SelectedReadingWord {
  return {
    surface: word.name,
    clean: word.name,
    saved: {
      id: word.id,
      vaultId: word.vaultId,
      vaultName,
      translations: word.translations,
      grammaticalClass: word.grammaticalClass,
      confidence: word.confidence,
      notes: word.notes ?? null,
    },
  };
}

function WordExtras({ word }: { word: Word }) {
  const queryClient = useQueryClient();
  const { data: relatedWords = [], isLoading } = useQuery({
    queryKey: ["relatedWords", word.id],
    queryFn: () => getRelatedWords(word.id),
  });

  return (
    <div className="mt-4 space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-[#8a8a8a] dark:text-zinc-400">
            Palavras relacionadas
          </p>
          <LinkWordsDialog
            word={word}
            triggerLabel="Vincular"
            onWordsLinked={() => {
              queryClient.invalidateQueries({
                queryKey: ["relatedWords", word.id],
              });
            }}
          />
        </div>
        {isLoading ? (
          <p className="mt-1 text-[12px] text-[#afafaf]">Carregando...</p>
        ) : relatedWords.length === 0 ? (
          <p className="mt-1 text-[12px] text-[#afafaf]">
            Nenhum link ainda
          </p>
        ) : (
          <ul className="mt-1.5 space-y-1">
            {relatedWords.map((related) => (
              <li
                key={related.id}
                className="rounded bg-[#f6f6f6] px-2.5 py-1.5 text-[13px] dark:bg-zinc-800"
              >
                <span className="font-medium text-[#333] dark:text-zinc-100">
                  {related.name}
                </span>
                {related.translations[0] && (
                  <span className="mt-0.5 block text-[12px] text-[#2b7de9] dark:text-sky-300">
                    {related.translations[0]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {word.category && (
          <span className="rounded bg-[#f3f3f3] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#888] dark:bg-white/10 dark:text-gray-400">
            {word.category}
          </span>
        )}
        <button
          type="button"
          onClick={async () => {
            await incrementWordFrequency(word.id);
            queryClient.invalidateQueries({ queryKey: ["vaults"] });
          }}
          className="rounded bg-[#f3f3f3] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#888] hover:bg-[#eef6ff] hover:text-[#1cb0f6] dark:bg-white/10 dark:text-gray-400"
          title="Incrementar frequência"
        >
          Freq. {word.frequency}
        </button>
      </div>

      <div className="flex items-center gap-1">
        <EditWordDialog
          word={word}
          onWordUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["vaults"] });
          }}
        />
      </div>
    </div>
  );
}

export function VaultWordsList({
  words,
  vault,
  vaults,
  onAddWord,
}: {
  words: Word[];
  vault: Vault;
  vaults: Vault[];
  onAddWord: () => void;
}) {
  const queryClient = useQueryClient();
  const updateWordMutation = useUpdateWord();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [wordInfo, setWordInfo] = useState<DictionaryWordInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [panelClosed, setPanelClosed] = useState(false);

  useEffect(() => {
    if (panelClosed) return;
    if (selectedId == null && words[0]) {
      setSelectedId(words[0].id);
    }
  }, [words, selectedId, panelClosed]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return words;
    return words.filter(
      (word) =>
        word.name.toLowerCase().includes(term) ||
        word.translations.some((item) => item.toLowerCase().includes(term))
    );
  }, [words, query]);

  const selectedWord = words.find((word) => word.id === selectedId) ?? null;
  const selected = selectedWord
    ? toSelectedWord(selectedWord, vault.name)
    : null;

  const selectWord = (word: Word) => {
    setPanelClosed(false);
    setSelectedId(word.id);
    playWordAudio(word.name);
    setWordInfo(null);
    setIsLoadingInfo(true);
    lookupWordInfo(word.name)
      .then((info) => setWordInfo(info))
      .finally(() => setIsLoadingInfo(false));
  };

  return (
    <div className="flex">
      <div className="min-w-0 flex-1 px-6 pb-10 pt-5 sm:px-8">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#afafaf]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar palavra ou tradução"
              className="h-10 w-full rounded-md border border-[#e5e5e5] bg-transparent pl-10 pr-3 text-[14px] text-[#3c3c3c] outline-none placeholder:text-[#afafaf] focus:border-[#1cb0f6] dark:border-[#373e47] dark:text-zinc-100"
            />
          </div>
          <button
            type="button"
            onClick={onAddWord}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-[#1cb0f6] px-3 text-[12px] font-extrabold uppercase tracking-wide text-white hover:bg-[#1a9ee0]"
          >
            <Plus className="size-4" />
            Nova
          </button>
        </div>

        <div className="mb-5">
          <SearchWord />
        </div>

        {filtered.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-[#afafaf]">
            Nenhuma palavra encontrada.
          </p>
        ) : (
          <ul>
            {filtered.map((word) => {
              const active = word.id === selectedId;
              return (
                <li key={word.id}>
                  <button
                    type="button"
                    onClick={() => selectWord(word)}
                    className={cn(
                      "w-full rounded-md px-3 py-3 text-left",
                      active
                        ? "bg-[#ddf4ff] dark:bg-[#1cb0f6]/15"
                        : "hover:bg-black/[0.03] dark:hover:bg-white/5"
                    )}
                  >
                    <span className="block text-[15px] font-medium text-[#333] dark:text-zinc-100">
                      {word.name}
                    </span>
                    {word.translations.length > 0 ? (
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {word.translations.map((item) => (
                          <span
                            key={item}
                            className="rounded bg-[#eef6ff] px-2 py-0.5 text-[13px] text-[#2b7de9] dark:bg-sky-950 dark:text-sky-300"
                          >
                            {item}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="mt-1 block text-[13px] text-[#afafaf]">
                        Sem tradução
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div
        className={cn(
          "hidden lg:block lg:shrink-0 lg:transition-[width] lg:duration-300",
          selected ? "lg:w-[300px]" : "lg:w-0"
        )}
      />
      <ReadingWordPanel
        docked
        selected={selected}
        sourceText=""
        userVaults={vaults}
        wordInfo={wordInfo}
        isLoadingInfo={isLoadingInfo}
        isSaving={isSaving}
        extras={selectedWord ? <WordExtras word={selectedWord} /> : null}
        onClose={() => {
          setPanelClosed(true);
          setSelectedId(null);
        }}
        onSave={async () => undefined}
        onUpdate={async (wordId, data) => {
          setIsSaving(true);
          try {
            await updateWordMutation.mutateAsync({ wordId, data });
          } finally {
            setIsSaving(false);
          }
        }}
        onRemove={async (wordName, vaultId) => {
          setIsSaving(true);
          try {
            await removeWordFromVault(wordName, vaultId);
            await queryClient.invalidateQueries({ queryKey: ["vaults"] });
            setSelectedId(null);
          } finally {
            setIsSaving(false);
          }
        }}
      />
    </div>
  );
}
