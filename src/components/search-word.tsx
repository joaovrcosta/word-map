"use client";

import { useState, useEffect } from "react";
import { Search, BookOpen, X, Plus, PlusCircle, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  searchWordInVaults,
  type SearchResult,
  getVaults,
  type Vault,
  createWord,
} from "@/actions/actions";
import { useDebounce } from "@/hooks/use-debounce";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface SearchWordProps {
  onWordSelect?: (result: SearchResult) => void;
}

interface ApiWordResult {
  word: string;
  phonetic?: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
    }>;
  }>;
}

export function SearchWord({ onWordSelect }: SearchWordProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [apiResults, setApiResults] = useState<ApiWordResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedWord, setSelectedWord] = useState<
    SearchResult | ApiWordResult | null
  >(null);
  const [isAddingToVault, setIsAddingToVault] = useState(false);
  const [vaultSearchTerm, setVaultSearchTerm] = useState("");

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Buscar vaults disponíveis
  useEffect(() => {
    const fetchVaults = async () => {
      try {
        const vaultsData = await getVaults();
        setVaults(vaultsData);
      } catch (error) {
        console.error("Erro ao buscar vaults:", error);
      }
    };
    fetchVaults();
  }, []);

  // Buscar palavra na API pública
  const searchWordInApi = async (word: string): Promise<ApiWordResult[]> => {
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
      );
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Erro ao buscar na API:", error);
      return [];
    }
  };

  useEffect(() => {
    if (debouncedSearchTerm.trim().length === 0) {
      setResults([]);
      setApiResults([]);
      setShowResults(false);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      setIsSearchingApi(true);

      try {
        // Buscar nos vaults
        const searchResults = await searchWordInVaults(debouncedSearchTerm);
        setResults(searchResults);

        // Buscar na API pública
        const apiSearchResults = await searchWordInApi(debouncedSearchTerm);
        setApiResults(apiSearchResults);

        setShowResults(true);
      } catch (error) {
        console.error("Erro na pesquisa:", error);
        setResults([]);
        setApiResults([]);
      } finally {
        setIsSearching(false);
        setIsSearchingApi(false);
      }
    };

    performSearch();
  }, [debouncedSearchTerm]);

  const handleClearSearch = () => {
    setSearchTerm("");
    setResults([]);
    setApiResults([]);
    setShowResults(false);
  };

  const handleWordSelect = (result: SearchResult) => {
    if (onWordSelect) {
      onWordSelect(result);
    }
    setShowResults(false);
  };

  const handleAddToVault = async (vault: Vault) => {
    if (!selectedWord) return;

    setIsAddingToVault(true);
    try {
      let wordData;

      if ("vault" in selectedWord) {
        // É uma palavra existente dos vaults
        wordData = {
          name: selectedWord.word.name,
          grammaticalClass: selectedWord.word.grammaticalClass,
          category: selectedWord.word.category || undefined,
          translations: selectedWord.word.translations,
          confidence: selectedWord.word.confidence,
          vaultId: vault.id,
        };
      } else {
        // É uma palavra da API
        const firstMeaning = selectedWord.meanings[0];
        wordData = {
          name: selectedWord.word,
          grammaticalClass: firstMeaning?.partOfSpeech || "substantivo",
          category: undefined,
          translations: [firstMeaning?.definitions[0]?.definition || ""],
          confidence: 1,
          vaultId: vault.id,
        };
      }

      await createWord(wordData);

      // Fechar dropdown e mostrar mensagem de sucesso
      setSelectedWord(null);
      setVaultSearchTerm("");

      console.log(
        `Palavra "${
          "vault" in selectedWord ? selectedWord.word.name : selectedWord.word
        }" adicionada ao vault "${vault.name}" com sucesso!`
      );
    } catch (error) {
      console.error("Erro ao adicionar palavra ao vault:", error);
    } finally {
      setIsAddingToVault(false);
    }
  };

  // Filtrar vaults baseado no termo de busca
  const filteredVaults = vaults.filter((vault) =>
    vault.name.toLowerCase().includes(vaultSearchTerm.toLowerCase())
  );

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
          ) : (
            <div className="p-2">
              {/* Resultados dos vaults */}
              {results.length > 0 && (
                <>
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    {results.length} palavra{results.length !== 1 ? "s" : ""}{" "}
                    encontrada{results.length !== 1 ? "s" : ""} nos vaults
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
                            <span className="font-medium">
                              {result.vault.name}
                            </span>
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
                        {/* Botão de adicionar com dropdown */}
                        <div className="ml-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWord(result);
                                  setVaultSearchTerm("");
                                }}
                              >
                                <PlusCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              className="w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
                              align="end"
                            >
                              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                  Adicionar à palavra
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {result.word.name}
                                </p>
                              </div>

                              {/* Campo de busca */}
                              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                                  <Input
                                    type="text"
                                    placeholder="Procurar um vault..."
                                    value={vaultSearchTerm}
                                    onChange={(e) =>
                                      setVaultSearchTerm(e.target.value)
                                    }
                                    className="pl-8 h-8 text-xs"
                                  />
                                </div>
                              </div>

                              {/* Opção de novo vault */}
                              <DropdownMenuItem className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <Plus className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                                <span className="text-sm text-gray-900 dark:text-white">
                                  + Novo vault
                                </span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {/* Lista de vaults */}
                              <div className="max-h-48 overflow-y-auto">
                                {filteredVaults.length > 0 ? (
                                  filteredVaults.map((vault) => (
                                    <DropdownMenuItem
                                      key={vault.id}
                                      className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                      onClick={() => handleAddToVault(vault)}
                                      disabled={isAddingToVault}
                                    >
                                      <div className="flex items-center w-full">
                                        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center mr-3">
                                          <BookOpen className="h-4 w-4 text-white" />
                                        </div>
                                        <span className="text-sm text-gray-900 dark:text-white flex-1">
                                          {vault.name}
                                        </span>
                                        {isAddingToVault ? (
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                        ) : (
                                          <div className="w-4 h-4 border border-gray-300 dark:border-gray-600 rounded-full"></div>
                                        )}
                                      </div>
                                    </DropdownMenuItem>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {vaultSearchTerm
                                        ? "Nenhum vault encontrado"
                                        : "Nenhum vault disponível"}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Resultados da API */}
              {apiResults.length > 0 && (
                <>
                  {results.length > 0 && (
                    <DropdownMenuSeparator className="my-2" />
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    {apiResults.length} palavra
                    {apiResults.length !== 1 ? "s" : ""} encontrada
                    {apiResults.length !== 1 ? "s" : ""} na API
                  </div>
                  {apiResults.map((apiResult, index) => (
                    <div
                      key={`api-${index}`}
                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Globe className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-sm text-gray-900 dark:text-white">
                              {apiResult.word}
                            </span>
                            {apiResult.phonetic && (
                              <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                {apiResult.phonetic}
                              </span>
                            )}
                          </div>
                          {apiResult.meanings
                            .slice(0, 2)
                            .map((meaning, meaningIndex) => (
                              <div key={meaningIndex} className="mb-2">
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                  <span className="font-medium">
                                    {meaning.partOfSpeech}:
                                  </span>{" "}
                                  {meaning.definitions[0]?.definition}
                                </p>
                                {meaning.definitions[0]?.example && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                    Ex: {meaning.definitions[0].example}
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                        {/* Botão de adicionar com dropdown */}
                        <div className="ml-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => {
                                  setSelectedWord(apiResult);
                                  setVaultSearchTerm("");
                                }}
                              >
                                <PlusCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              className="w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
                              align="end"
                            >
                              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                                  Adicionar palavra
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {apiResult.word}
                                </p>
                              </div>

                              {/* Campo de busca */}
                              <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                                  <Input
                                    type="text"
                                    placeholder="Procurar um vault..."
                                    value={vaultSearchTerm}
                                    onChange={(e) =>
                                      setVaultSearchTerm(e.target.value)
                                    }
                                    className="pl-8 h-8 text-xs"
                                  />
                                </div>
                              </div>

                              {/* Opção de novo vault */}
                              <DropdownMenuItem className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <Plus className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400" />
                                <span className="text-sm text-gray-900 dark:text-white">
                                  + Novo vault
                                </span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {/* Lista de vaults */}
                              <div className="max-h-48 overflow-y-auto">
                                {filteredVaults.length > 0 ? (
                                  filteredVaults.map((vault) => (
                                    <DropdownMenuItem
                                      key={vault.id}
                                      className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                      onClick={() => handleAddToVault(vault)}
                                      disabled={isAddingToVault}
                                    >
                                      <div className="flex items-center w-full">
                                        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center mr-3">
                                          <BookOpen className="h-4 w-4 text-white" />
                                        </div>
                                        <span className="text-sm text-gray-900 dark:text-white flex-1">
                                          {vault.name}
                                        </span>
                                        {isAddingToVault ? (
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                        ) : (
                                          <div className="w-4 h-4 border border-gray-300 dark:border-gray-600 rounded-full"></div>
                                        )}
                                      </div>
                                    </DropdownMenuItem>
                                  ))
                                ) : (
                                  <div className="px-3 py-2 text-center">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {vaultSearchTerm
                                        ? "Nenhum vault encontrado"
                                        : "Nenhum vault disponível"}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Nenhum resultado */}
              {results.length === 0 &&
                apiResults.length === 0 &&
                !isSearching && (
                  <div className="p-4 text-center text-gray-500">
                    <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p>Nenhuma palavra encontrada</p>
                    <p className="text-xs mt-1">
                      Tente outro termo de pesquisa
                    </p>
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
