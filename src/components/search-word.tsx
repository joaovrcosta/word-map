"use client";

import { useState, useEffect } from "react";
import { Search, BookOpen, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchWordInVaults, type SearchResult } from "@/actions/actions";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchWordProps {
  onWordSelect?: (result: SearchResult) => void;
}

export function SearchWord({ onWordSelect }: SearchWordProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearchTerm.trim().length === 0) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const searchResults = await searchWordInVaults(debouncedSearchTerm);
        setResults(searchResults);
        setShowResults(true);
      } catch (error) {
        console.error("Erro na pesquisa:", error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchTerm]);

  const handleClearSearch = () => {
    setSearchTerm("");
    setResults([]);
    setShowResults(false);
  };

  const handleWordSelect = (result: SearchResult) => {
    if (onWordSelect) {
      onWordSelect(result);
    }
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Pesquisar palavras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Resultados da pesquisa */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2">Pesquisando...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                {results.length} resultado{results.length !== 1 ? "s" : ""}{" "}
                encontrado{results.length !== 1 ? "s" : ""}
              </div>
              {results.map((result) => (
                <div
                  key={`${result.vault.id}-${result.word.id}`}
                  className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors"
                  onClick={() => handleWordSelect(result)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {result.word.name}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {result.word.grammaticalClass}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Traduções: {result.word.translations.join(", ")}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Vault:{" "}
                        <span className="font-medium">{result.vault.name}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Confiança: {result.word.confidence}/4
                      </div>
                      <div className="flex gap-1 mt-1">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-2 w-1 rounded-sm ${
                              i < result.word.confidence
                                ? "bg-yellow-500"
                                : "bg-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p>Nenhuma palavra encontrada</p>
              <p className="text-xs mt-1">Tente outro termo de pesquisa</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
