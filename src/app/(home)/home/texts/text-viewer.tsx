"use client";

import { useState, useEffect } from "react";
import {
  Text,
  checkTextWords,
  createWord,
  getVaults,
  updateText,
} from "@/actions/actions";
import { Vault, Word } from "@/actions/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Target,
  Info,
  ChevronDown,
  Plus,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { translateDefinitions } from "@/lib/translate";

interface TextViewerProps {
  text: Text;
  onTextUpdated?: () => void;
}

interface FoundWord {
  word: string;
  vaultInfo: Vault[];
}

export function TextViewer({ text, onTextUpdated }: TextViewerProps) {
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userVaults, setUserVaults] = useState<Vault[]>([]);
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [wordInfoMap, setWordInfoMap] = useState<Record<string, any>>({});
  const [loadingWords, setLoadingWords] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(text.title);
  const [editContent, setEditContent] = useState(text.content);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

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

      await updateText(text.id, editTitle, editContent);

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

  // Função para adicionar palavra ao vault com informações da API
  const handleAddWordToVault = async (word: string, vaultId: number) => {
    try {
      setIsAddingWord(true);

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

      // Buscar informações da palavra se ainda não foram buscadas
      let wordInfo = wordInfoMap[word];
      if (!wordInfo) {
        wordInfo = await fetchWordInfo(word);
        if (wordInfo) {
          setWordInfoMap((prev) => ({
            ...prev,
            [word]: wordInfo,
          }));
        }
      }

      // Preparar dados da palavra com informações da API
      let wordData: any = {
        name: word, // Usar a palavra limpa
        grammaticalClass: "substantivo", // Padrão
        category: undefined,
        translations: [],
        confidence: 1,
        vaultId: vaultId,
      };

      // Se temos informações da API, usar para preencher dados
      if (wordInfo) {
        // Determinar classe gramatical
        if (wordInfo.meanings && wordInfo.meanings.length > 0) {
          const primaryMeaning = wordInfo.meanings[0];
          wordData.grammaticalClass =
            primaryMeaning.partOfSpeech || "substantivo";

          // Extrair definições como traduções
          if (
            primaryMeaning.definitions &&
            primaryMeaning.definitions.length > 0
          ) {
            const definitions = primaryMeaning.definitions
              .slice(0, 3) // Máximo 3 definições
              .map((def: any) => def.definition)
              .filter((def: string) => def && def.length > 0);

            // Traduzir definições para português
            try {
              wordData.translations = await translateDefinitions(definitions);
            } catch (error) {
              console.warn(
                "Erro ao traduzir definições, usando originais:",
                error
              );
              wordData.translations = definitions;
            }
          }
        }
      }

      // Criar nova palavra
      await createWord(wordData);

      toast({
        title: "Palavra adicionada!",
        description: `"${word}" foi adicionada ao vault "${vault?.name}" com informações da API`,
      });

      // Recarregar dados para atualizar a lista
      const [words, vaults] = await Promise.all([
        checkTextWords(text.content),
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
                      <strong>Significado:</strong>{" "}
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
  const renderAddWordDropdown = (originalWord: string, cleanWord: string) => {
    const wordInfo = wordInfoMap[cleanWord];
    const isLoadingInfo = loadingWords.has(cleanWord);

    return (
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) {
            handleFetchWordInfo(cleanWord);
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <span className="word-clickable text-gray-900 dark:text-gray-100 px-1 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {originalWord}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
          <div className="p-3">
            <div className="font-medium text-lg mb-3 text-center border-b pb-2">
              Adicionar "{originalWord}" ao vault
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

                {/* Informações que serão salvas */}
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">
                    Será salvo com:
                  </div>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="font-medium">Classe:</span>{" "}
                      {wordInfo.meanings?.[0]?.partOfSpeech || "substantivo"}
                    </div>
                    <div>
                      <span className="font-medium">Significado:</span>{" "}
                      {wordInfo.meanings?.[0]?.definitions
                        ?.slice(0, 2)
                        ?.map((def: any) => def.definition)
                        ?.join(", ") || "Nenhuma"}
                    </div>
                    <div>
                      <span className="font-medium">Nível:</span> 1 (pouco
                      praticada)
                    </div>
                  </div>
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
                  onClick={() => handleAddWordToVault(cleanWord, vault.id)}
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

  // Função para limpar palavra removendo caracteres especiais e pontuação
  const cleanWord = (word: string): string => {
    return word
      .replace(/[^\w\s]/g, "") // Remove tudo exceto letras, números e espaços
      .trim()
      .toLowerCase();
  };

  // Função para renderizar o texto com highlights interativos e palavras clicáveis
  const renderInteractiveText = () => {
    let content = editContent;

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
            // Limpar a palavra para verificar se é válida
            const cleanWordText = cleanWord(word);

            // Só processar se a palavra limpa tiver pelo menos 3 caracteres
            if (cleanWordText.length >= 3) {
              return (
                <span key={`${index}-${wordIndex}`}>
                  {renderAddWordDropdown(word, cleanWordText)}
                </span>
              );
            }
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
    <div className="space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto pr-2">
      {/* Cabeçalho com Título e Botão de Edição */}
      <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-gray-950 pt-2 pb-4 z-10">
        <div className="flex-1">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-2xl font-bold border-2 border-blue-300 focus:border-blue-500"
              placeholder="Título do texto"
            />
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {text.title}
              </h1>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                onClick={handleSaveEdit}
                disabled={isSaving}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar
              </Button>
              <Button
                onClick={handleCancelEdit}
                disabled={isSaving}
                size="sm"
                variant="outline"
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              size="sm"
              variant="outline"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="flex gap-3">
        <Card className="p-3 flex-1">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {editContent.split(" ").length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Total de Palavras
            </div>
          </div>
        </Card>

        <Card className="p-3 flex-1">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {foundWords.length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Palavras nos Vaults
            </div>
          </div>
        </Card>

        <Card className="p-3 flex-1">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {
                new Set(
                  foundWords.flatMap((fw) => fw.vaultInfo.map((v) => v.id))
                ).size
              }
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Vaults diferentes encontrados
            </div>
          </div>
        </Card>
      </div>

      {/* Texto com Highlights Interativos e Palavras Clicáveis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-yellow-600" />
            Texto Interativo
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-normal">
            {isEditing
              ? "Edite o texto abaixo. As palavras continuarão sendo destacadas e clicáveis."
              : "Clique nas palavras destacadas para ver detalhes ou nas outras palavras para adicioná-las aos vaults"}
          </p>
        </CardHeader>
        <CardContent className="max-h-[400px] overflow-y-auto">
          {isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-64 text-sm leading-relaxed resize-none"
                placeholder="Digite ou cole o texto aqui..."
              />

              {/* Preview do texto com highlights */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Preview com Highlights:
                </h4>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="leading-relaxed text-gray-900 dark:text-gray-100">
                    {renderInteractiveText()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="leading-relaxed text-gray-900 dark:text-gray-100">
                {renderInteractiveText()}
              </div>
            </div>
          )}

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
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="w-5 h-5 text-green-600" />
              Palavras Encontradas nos Vaults
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[250px] overflow-y-auto space-y-3 pr-2">
              {foundWords.map(({ word, vaultInfo }) => (
                <div
                  key={word}
                  className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {word}
                    </Badge>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Encontrada em {vaultInfo.length} vault
                      {vaultInfo.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {vaultInfo.map((vault) => (
                      <div
                        key={vault.id}
                        className="bg-gray-50 dark:bg-gray-800 p-2 rounded-lg"
                      >
                        <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                          {vault.name}
                        </div>
                        {vault.words.map((vaultWord) => (
                          <div key={vaultWord.id} className="text-sm space-y-1">
                            <div className="text-gray-600 dark:text-gray-400">
                              {vaultWord.translations.join(", ")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className="text-xs px-1 py-0"
                              >
                                {vaultWord.grammaticalClass}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="text-xs px-1 py-0"
                              >
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
