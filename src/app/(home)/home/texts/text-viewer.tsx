"use client";

import { useState, useEffect } from "react";
import { Text, checkTextWords, createWord, getVaults } from "@/actions/actions";
import { Vault, Word } from "@/actions/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Target, Info, ChevronDown, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface TextViewerProps {
  text: Text;
}

interface FoundWord {
  word: string;
  vaultInfo: Vault[];
}

export function TextViewer({ text }: TextViewerProps) {
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userVaults, setUserVaults] = useState<Vault[]>([]);
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [wordInfoMap, setWordInfoMap] = useState<Record<string, any>>({});
  const [loadingWords, setLoadingWords] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // TODO: Pegar userId do contexto de autenticação
        const userId = 1; // Temporário

        // Carregar palavras encontradas e vaults do usuário
        const [words, vaults] = await Promise.all([
          checkTextWords(text.content, userId),
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

  // Função para buscar informações da palavra na API de dicionário
  const fetchWordInfo = async (word: string) => {
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data[0]; // Primeira entrada
    } catch (error) {
      console.error("Erro ao buscar palavra:", error);
      return null;
    }
  };

  // Função para buscar informações da palavra
  const handleFetchWordInfo = async (word: string) => {
    if (wordInfoMap[word] || loadingWords.has(word)) {
      return; // Já foi buscada ou está sendo buscada
    }

    setLoadingWords((prev) => new Set(prev).add(word));

    const info = await fetchWordInfo(word);

    setWordInfoMap((prev) => ({
      ...prev,
      [word]: info,
    }));

    setLoadingWords((prev) => {
      const newSet = new Set(prev);
      newSet.delete(word);
      return newSet;
    });
  };

  // Função para adicionar palavra ao vault
  const handleAddWordToVault = async (word: string, vaultId: number) => {
    try {
      setIsAddingWord(true);

      // TODO: Pegar userId do contexto de autenticação
      const userId = 1; // Temporário

      // Verificar se a palavra já existe no vault
      const vault = userVaults.find((v) => v.id === vaultId);
      if (
        vault?.words.some((w) => w.name.toLowerCase() === word.toLowerCase())
      ) {
        toast({
          title: "Palavra já existe",
          description: `"${word}" já está salva no vault "${vault.name}"`,
          variant: "destructive",
        });
        return;
      }

      // Criar nova palavra
      await createWord({
        name: word,
        grammaticalClass: "substantivo", // Padrão
        category: undefined, // Opcional
        translations: [], // Vazio por padrão
        confidence: 1, // Nível 1 por padrão
        vaultId: vaultId,
      });

      toast({
        title: "Palavra adicionada!",
        description: `"${word}" foi adicionada ao vault "${vault?.name}"`,
      });

      // Recarregar dados para atualizar a lista
      const [words, vaults] = await Promise.all([
        checkTextWords(text.content, userId),
        getVaults(),
      ]);

      setFoundWords(words);
      setUserVaults(vaults);
    } catch (error) {
      console.error("Erro ao adicionar palavra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a palavra ao vault",
        variant: "destructive",
      });
    } finally {
      setIsAddingWord(false);
    }
  };

  // Função para renderizar dropdown de detalhes da palavra
  const renderWordDropdown = (word: string, vaultInfo: Vault[]) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <span className="highlighted-word bg-yellow-200 dark:bg-yellow-800 px-1 rounded cursor-pointer hover:bg-yellow-300 dark:hover:bg-yellow-700 transition-colors inline-flex items-center gap-1">
          {word}
          <ChevronDown className="w-3 h-3" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
        <div className="p-3">
          <div className="font-medium text-lg mb-3 text-center border-b pb-2">
            {word}
          </div>
          <div className="space-y-3">
            {vaultInfo.map((vault) => (
              <div
                key={vault.id}
                className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg"
              >
                <div className="font-medium text-sm text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  {vault.name}
                </div>
                {vault.words.map((vaultWord) => (
                  <div key={vaultWord.id} className="text-sm space-y-2">
                    <div className="text-gray-600 dark:text-gray-400">
                      <strong>Traduções:</strong>{" "}
                      {vaultWord.translations.join(", ")}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {vaultWord.grammaticalClass}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Nível {vaultWord.confidence}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Função para renderizar dropdown de adicionar palavra com informações da API
  const renderAddWordDropdown = (word: string) => {
    const wordInfo = wordInfoMap[word];
    const isLoadingInfo = loadingWords.has(word);

    return (
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) {
            handleFetchWordInfo(word);
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <span className="word-clickable text-gray-900 dark:text-gray-100 px-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {word}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
          <div className="p-3">
            <div className="font-medium text-lg mb-3 text-center border-b pb-2">
              Adicionar "{word}" ao vault
            </div>

            {/* Informações da palavra da API */}
            {isLoadingInfo && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Buscando informações...</p>
              </div>
            )}

            {wordInfo && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                  {/* Pronúncia */}
                  {wordInfo.phonetic && (
                    <div>
                      <span className="font-medium text-blue-600">
                        Pronúncia:
                      </span>{" "}
                      {wordInfo.phonetic}
                    </div>
                  )}

                  {/* Definições */}
                  {wordInfo.meanings && wordInfo.meanings.length > 0 && (
                    <div>
                      <span className="font-medium text-blue-600">
                        Definições:
                      </span>
                      <div className="mt-1 space-y-1">
                        {wordInfo.meanings
                          .slice(0, 2)
                          .map((meaning: any, index: number) => (
                            <div
                              key={index}
                              className="text-xs pl-2 border-l-2 border-blue-300"
                            >
                              <span className="font-medium text-gray-600 dark:text-gray-400">
                                {meaning.partOfSpeech}:
                              </span>{" "}
                              {meaning.definitions[0]?.definition ||
                                "Definição não disponível"}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Exemplos */}
                  {wordInfo.meanings &&
                    wordInfo.meanings[0]?.definitions[0]?.example && (
                      <div>
                        <span className="font-medium text-blue-600">
                          Exemplo:
                        </span>
                        <div className="mt-1 text-xs italic text-gray-600 dark:text-gray-400 pl-2">
                          "{wordInfo.meanings[0].definitions[0].example}"
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* Seleção de vault */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Escolha o vault:
              </div>
              {userVaults.map((vault) => (
                <DropdownMenuItem
                  key={vault.id}
                  onClick={() => handleAddWordToVault(word, vault.id)}
                  disabled={isAddingWord}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>{vault.name}</span>
                  {isAddingWord && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 ml-auto"></div>
                  )}
                </DropdownMenuItem>
              ))}
            </div>

            {userVaults.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p className="text-sm">Nenhum vault encontrado</p>
                <p className="text-xs">
                  Crie um vault primeiro para adicionar palavras
                </p>
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  // Função para renderizar o texto com highlights interativos e palavras clicáveis
  const renderInteractiveText = () => {
    let content = text.content;

    // Primeiro, marcar palavras já encontradas
    foundWords.forEach(({ word, vaultInfo }) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      content = content.replace(regex, `__HIGHLIGHT_${word}__`);
    });

    // Dividir o texto em partes
    const parts = content.split(/(__HIGHLIGHT_\w+__)/);

    return parts.map((part, index) => {
      if (part.startsWith("__HIGHLIGHT_") && part.endsWith("__")) {
        // Palavra já encontrada - mostrar dropdown de detalhes
        const word = part.replace(/__HIGHLIGHT_|__/g, "");
        const wordData = foundWords.find(
          (fw) => fw.word.toLowerCase() === word.toLowerCase()
        );

        if (wordData) {
          return (
            <span key={index}>
              {renderWordDropdown(wordData.word, wordData.vaultInfo)}
            </span>
          );
        }
      } else if (part.trim() && part.length > 0) {
        // Texto normal - dividir em palavras individuais
        const words = part.split(/(\s+)/);
        return words.map((word, wordIndex) => {
          if (word.trim() && word.length > 2) {
            // Palavras com mais de 2 caracteres
            return (
              <span key={`${index}-${wordIndex}`}>
                {renderAddWordDropdown(word)}
              </span>
            );
          }
          return word;
        });
      }
      return part;
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Analisando texto...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total de Palavras
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {text.content.split(" ").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Palavras nos Vaults
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {foundWords.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Vaults Encontrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {
                new Set(
                  foundWords.flatMap((fw) => fw.vaultInfo.map((v) => v.id))
                ).size
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Texto com Highlights Interativos e Palavras Clicáveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-yellow-600" />
            Texto Interativo
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
            Clique nas palavras destacadas para ver detalhes ou nas outras
            palavras para adicioná-las aos vaults
          </p>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="leading-relaxed text-gray-900 dark:text-gray-100">
              {renderInteractiveText()}
            </div>
          </div>

          {foundWords.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Info className="w-8 h-8 mx-auto mb-2" />
              <p>Nenhuma palavra dos seus vaults foi encontrada neste texto.</p>
              <p className="text-sm">
                Clique em qualquer palavra para adicioná-la aos seus vaults!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de Palavras Encontradas */}
      {foundWords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-600" />
              Palavras Encontradas nos Vaults
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {foundWords.map(({ word, vaultInfo }) => (
                <div
                  key={word}
                  className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {word}
                    </Badge>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Encontrada em {vaultInfo.length} vault
                      {vaultInfo.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {vaultInfo.map((vault) => (
                      <div
                        key={vault.id}
                        className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg"
                      >
                        <div className="font-medium text-sm text-gray-900 dark:text-white mb-2">
                          {vault.name}
                        </div>
                        {vault.words.map((vaultWord) => (
                          <div key={vaultWord.id} className="text-sm space-y-1">
                            <div className="text-gray-600 dark:text-gray-400">
                              {vaultWord.translations.join(", ")}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {vaultWord.grammaticalClass}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Nível {vaultWord.confidence}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
