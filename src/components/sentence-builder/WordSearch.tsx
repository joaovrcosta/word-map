"use client";

import { Search, Plus, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
    <Card className="p-4">
      <h3 className="font-medium text-gray-900 dark:text-white mb-3">
        Pesquisar Palavras
      </h3>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={16}
        />
        <Input
          placeholder="Digite para pesquisar palavras do vault ou palavras novas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de palavras filtradas */}
      <div className="mt-4 max-h-96 overflow-y-auto space-y-2">
        {isSearching && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}

        {!isSearching &&
          filteredWords.length === 0 &&
          searchTerm.length >= 2 && (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhuma palavra encontrada
            </p>
          )}

        {filteredWords.map((word) => {
          const isExternal = "isExternal" in word && word.isExternal;
          return (
            <div
              key={word.id}
              className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                isExternal
                  ? "border-blue-300 bg-blue-50/50 dark:bg-blue-900/20"
                  : ""
              }`}
              onClick={() => onAddWord(word)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {word.name}
                    </p>
                    {isExternal && (
                      <div className="flex items-center gap-1">
                        <Globe size={12} className="text-blue-500" />
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          Nova palavra
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {word.translations.length > 0
                      ? word.translations.join(", ")
                      : isExternal
                      ? "Tradução será buscada automaticamente"
                      : "Sem traduções"}
                  </p>
                  {isExternal && (
                    <p className="text-xs text-gray-500 mt-1">
                      Classe: {word.grammaticalClass}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isTranslating && isExternal && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                  <Plus size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
