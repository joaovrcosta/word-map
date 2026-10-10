"use client";

import { Search, Plus, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Word, ExternalWord } from "./types";

interface WordSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredWords: (Word | ExternalWord)[];
  isSearching: boolean;
  isTranslating: boolean;
  onAddWord: (word: Word | ExternalWord) => void;
}

export function WordSearch({
  searchTerm,
  setSearchTerm,
  filteredWords,
  isSearching,
  isTranslating,
  onAddWord,
}: WordSearchProps) {
  return (
    <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 dark:bg-gray-950">
      <h3 className="text-lg font-extrabold text-[#3c3c3c] dark:text-white">
        Pesquisar palavras
      </h3>
      <p className="mt-1 text-sm font-bold text-[#afafaf]">
        Do vault ou uma palavra nova
      </p>

      <div className="relative mt-4">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#afafaf]"
          size={16}
        />
        <Input
          placeholder="Digite para pesquisar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-11 rounded-2xl border-2 pl-10 font-bold"
        />
      </div>

      <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
        {isSearching && (
          <div className="py-4 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-[#1cb0f6]" />
          </div>
        )}

        {!isSearching &&
          filteredWords.length === 0 &&
          searchTerm.length >= 2 && (
            <p className="py-4 text-center text-sm font-bold text-[#777]">
              Nenhuma palavra encontrada
            </p>
          )}

        {filteredWords.map((word) => {
          const isExternal = "isExternal" in word && word.isExternal;
          return (
            <button
              type="button"
              key={word.id}
              className={`w-full rounded-2xl border-2 p-3 text-left transition-colors hover:border-[#1cb0f6]/40 ${
                isExternal
                  ? "border-[#1cb0f6]/40 bg-[#ddf4ff]"
                  : "border-[#e5e5e5] bg-white"
              }`}
              onClick={() => onAddWord(word)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-extrabold text-[#3c3c3c] dark:text-white">
                      {word.name}
                    </p>
                    {isExternal && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-[#1cb0f6]">
                        <Globe size={12} />
                        Nova
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-bold text-[#777]">
                    {word.translations.length > 0
                      ? word.translations.join(", ")
                      : isExternal
                        ? "Tradução será buscada automaticamente"
                        : "Sem traduções"}
                  </p>
                  {isExternal && (
                    <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
                      {word.grammaticalClass}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {isTranslating && isExternal && (
                    <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-[#1cb0f6]" />
                  )}
                  <Plus size={16} className="text-[#1cb0f6]" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
