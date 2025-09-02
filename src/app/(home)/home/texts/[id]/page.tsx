"use client";

import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Calendar,
  Clock,
  BookOpen,
  ChevronDown,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Text,
  updateText,
  checkTextWords,
  getVaults,
  createWord,
  getTextById,
  removeWordFromVault,
  updateWord,
} from "@/actions/actions";
import { Vault } from "@/actions/actions";
import { translateDefinitions } from "@/lib/translate";

interface FoundWord {
  word: string;
  vaultInfo: Vault[];
}

// Componente memoizado para palavras encontradas
const WordDropdown = memo(
  ({
    word,
    vaultInfo,
    onAddToVault,
    onEditWord,
    onRemoveWordFromVault,
    isAddingWord,
  }: {
    word: string;
    vaultInfo: Vault[];
    onAddToVault: (vaultId: number, word: string) => void;
    onEditWord: (vaultWord: any) => void;
    onRemoveWordFromVault: (word: string, vaultId: number) => void;
    isAddingWord: boolean;
  }) => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <span className="word-found bg-yellow-200 dark:bg-yellow-800 px-1 rounded cursor-pointer hover:bg-yellow-300 dark:hover:bg-yellow-700 transition-colors inline-flex items-center gap-1">
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {vaultWord.grammaticalClass}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Nível {vaultWord.confidence}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => onEditWord(vaultWord)}
                            disabled={isAddingWord}
                            title="Editar significado"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() =>
                              onRemoveWordFromVault(word, vault.id)
                            }
                            disabled={isAddingWord}
                            title="Remover do vault"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
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
  }
);

WordDropdown.displayName = "WordDropdown";

// Componente memoizado para palavras adicionáveis
const AddWordDropdown = memo(
  ({
    originalWord,
    cleanWordText,
    wordInfo,
    isLoadingInfo,
    onFetchWordInfo,
    onAddToVault,
    userVaults,
    isAddingWord,
  }: {
    originalWord: string;
    cleanWordText: string;
    wordInfo: any;
    isLoadingInfo: boolean;
    onFetchWordInfo: (word: string) => void;
    onAddToVault: (
      vaultId: number,
      word: string,
      translations: string[],
      grammaticalClass: string,
      confidence: number
    ) => void;
    userVaults: Vault[];
    isAddingWord: boolean;
  }) => {
    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (open) {
          onFetchWordInfo(cleanWordText);
        }
      },
      [cleanWordText, onFetchWordInfo]
    );

    return (
      <DropdownMenu onOpenChange={handleOpenChange}>
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

            {isLoadingInfo && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Buscando informações...</p>
              </div>
            )}

            {wordInfo && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                  {wordInfo.phonetic && (
                    <div>
                      <span className="font-medium text-blue-600">
                        Pronúncia:
                      </span>{" "}
                      {wordInfo.phonetic}
                    </div>
                  )}

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
                        ?.join(", ") || "Não disponível"}
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
                  onClick={() => {
                    const translations = wordInfo?.meanings?.[0]?.definitions
                      ?.slice(0, 2)
                      ?.map((def: any) => def.definition) || [originalWord];
                    const grammaticalClass =
                      wordInfo?.meanings?.[0]?.partOfSpeech || "substantivo";
                    const confidence = 1;
                    onAddToVault(
                      vault.id,
                      originalWord,
                      translations,
                      grammaticalClass,
                      confidence
                    );
                  }}
                  disabled={isAddingWord || !wordInfo}
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
  }
);

AddWordDropdown.displayName = "AddWordDropdown";

// Hook personalizado para gerenciar visualização de texto em chunks
const useTextChunks = (content: string, chunkSize: number = 1000) => {
  const [visibleChunks, setVisibleChunks] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const chunks = useMemo(() => {
    if (!content) return [];
    const words = content.split(/(\s+)/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(""));
    }

    return chunks;
  }, [content, chunkSize]);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const element = event.currentTarget;
        if (!element) return;

        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const clientHeight = element.clientHeight;

        // Verificar se os valores são válidos
        if (scrollHeight <= clientHeight) return;

        // Calcular quais chunks devem estar visíveis
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
        const totalChunks = chunks.length;
        const visibleRange = Math.ceil(totalChunks * 0.3); // Mostrar 30% dos chunks

        const startChunk = Math.max(
          0,
          Math.floor(scrollPercentage * totalChunks) -
            Math.floor(visibleRange / 2)
        );
        const endChunk = Math.min(totalChunks - 1, startChunk + visibleRange);

        const newVisibleChunks = Array.from(
          { length: endChunk - startChunk + 1 },
          (_, i) => startChunk + i
        );

        if (
          JSON.stringify(newVisibleChunks) !== JSON.stringify(visibleChunks)
        ) {
          setIsLoading(true);
          setVisibleChunks(newVisibleChunks);

          // Simular um pequeno delay para evitar travamentos
          setTimeout(() => setIsLoading(false), 50);
        }
      }, 100); // Debounce de 100ms
    },
    [chunks.length, visibleChunks]
  );

  useEffect(() => {
    // Inicializar com os primeiros chunks visíveis
    const initialChunks = Math.min(3, chunks.length);
    setVisibleChunks(Array.from({ length: initialChunks }, (_, i) => i));
  }, [chunks.length]);

  return {
    chunks,
    visibleChunks,
    isLoading,
    handleScroll,
  };
};

export default function TextPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [text, setText] = useState<Text | null>(null);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [userVaults, setUserVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [wordInfoMap, setWordInfoMap] = useState<Record<string, any>>({});
  const [loadingWords, setLoadingWords] = useState<Set<string>>(new Set());
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
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

  // Usar chunks apenas para textos muito longos (>5000 caracteres)
  const shouldUseChunks = editContent.length > 5000;
  const {
    chunks,
    visibleChunks,
    isLoading: chunksLoading,
    handleScroll,
  } = useTextChunks(shouldUseChunks ? editContent : "", 1000);

  // Carregar dados do texto
  useEffect(() => {
    const loadTextData = async () => {
      if (hasLoaded) return; // Evitar múltiplas execuções

      try {
        setIsLoading(true);

        const textId = parseInt(params.id as string);

        // Buscar texto real da API
        const textData = await getTextById(textId);

        if (!textData) {
          toast({
            title: "Texto não encontrado",
            description:
              "O texto solicitado não foi encontrado ou não pertence a você",
            variant: "destructive",
          });
          return;
        }

        setText(textData);
        setEditTitle(textData.title);
        setEditContent(textData.content);

        // Carregar palavras encontradas e vaults
        const [words, vaults] = await Promise.all([
          checkTextWords(textData.content),
          getVaults(),
        ]);

        setFoundWords(words);
        setUserVaults(vaults);
        setHasLoaded(true);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o texto",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id && !hasLoaded) {
      loadTextData();
    }
  }, [params.id, hasLoaded]);

  // Função para salvar edições
  const handleSaveEdit = async () => {
    if (!text) return;

    try {
      setIsSaving(true);
      await updateText(text.id, editTitle, editContent);

      setText({ ...text, title: editTitle, content: editContent });
      setIsEditing(false);

      // Recarregar palavras encontradas
      const words = await checkTextWords(editContent);
      setFoundWords(words);

      toast({
        title: "Texto atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar:", error);
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
    if (text) {
      setEditTitle(text.title);
      setEditContent(text.content);
    }
    setIsEditing(false);
  };

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

      const translationsArray = editTranslations
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await updateWord(editingWord.id, {
        translations: translationsArray,
        grammaticalClass: editGrammaticalClass,
        confidence: editConfidence,
      });

      toast({
        title: "Palavra atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });

      setIsEditDialogOpen(false);
      setEditingWord(null);

      // Recarregar dados
      const [words, vaults] = await Promise.all([
        checkTextWords(editContent),
        getVaults(),
      ]);
      setFoundWords(words);
      setUserVaults(vaults);
    } catch (error) {
      console.error("Erro ao salvar palavra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Função para remover palavra do vault
  const handleRemoveWordFromVault = async (word: string, vaultId: number) => {
    try {
      setIsAddingWord(true);

      await removeWordFromVault(word, vaultId);

      toast({
        title: "Palavra removida!",
        description: `"${word}" foi removida do vault`,
      });

      // Recarregar dados
      const [words, vaults] = await Promise.all([
        checkTextWords(editContent),
        getVaults(),
      ]);
      setFoundWords(words);
      setUserVaults(vaults);
    } catch (error) {
      console.error("Erro ao remover palavra:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a palavra",
        variant: "destructive",
      });
    } finally {
      setIsAddingWord(false);
    }
  };

  // Função para limpar palavra
  const cleanWord = (word: string): string => {
    return word
      .replace(/[^\w\s]/g, "")
      .trim()
      .toLowerCase();
  };

  // Função para buscar informações da palavra da API
  const fetchWordInfo = useCallback(async (word: string) => {
    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data[0];
    } catch (error) {
      console.error("Erro ao buscar palavra:", error);
      return null;
    }
  }, []);

  // Função para renderizar texto interativo
  // Memoizar as funções de callback para evitar re-renderizações desnecessárias
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
          grammaticalClass:
            wordInfo?.meanings?.[0]?.partOfSpeech || "substantivo",
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
      confidence: number
    ) => {
      try {
        setIsAddingWord(true);
        const wordData = {
          name: word,
          grammaticalClass,
          translations,
          confidence,
          vaultId,
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
    [editContent, toast]
  );

  const handleFetchWordInfo = useCallback(
    async (word: string) => {
      if (wordInfoMap[word] || loadingWords.has(word)) return;

      setLoadingWords((prev) => new Set(prev).add(word));
      try {
        const info = await fetchWordInfo(word);
        setWordInfoMap((prev) => ({ ...prev, [word]: info }));
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
    [wordInfoMap, loadingWords, fetchWordInfo]
  );

  // Função para renderizar um pedaço de texto
  const renderTextChunk = useCallback(
    (content: string, chunkIndex: number = 0) => {
      // Marcar palavras encontradas
      foundWords.forEach(({ word }) => {
        const regex = new RegExp(`\\b${word}\\b`, "gi");
        content = content.replace(regex, `__HIGHLIGHT_${word}__`);
      });

      const parts = content.split(/(__HIGHLIGHT_\w+__)/);

      return parts.map((part, index) => {
        if (part.startsWith("__HIGHLIGHT_") && part.endsWith("__")) {
          const word = part.replace(/__HIGHLIGHT_|__/g, "");
          const wordData = foundWords.find(
            (fw) => fw.word.toLowerCase() === word.toLowerCase()
          );

          if (wordData) {
            return (
              <span key={`chunk-${chunkIndex}-${index}`}>
                <WordDropdown
                  word={wordData.word}
                  vaultInfo={wordData.vaultInfo}
                  onAddToVault={handleAddToVault}
                  onEditWord={handleEditWord}
                  onRemoveWordFromVault={handleRemoveWordFromVault}
                  isAddingWord={isAddingWord}
                />
              </span>
            );
          }
        } else if (part.trim() && part.length > 0) {
          const words = part.split(/(\s+)/);
          return words.map((word, wordIndex) => {
            if (word.trim() && word.length > 2) {
              const cleanWordText = cleanWord(word);
              if (cleanWordText.length >= 3) {
                const wordInfo = wordInfoMap[cleanWordText];
                const isLoadingInfo = loadingWords.has(cleanWordText);

                return (
                  <span
                    className="font-sans text-[20px]"
                    key={`chunk-${chunkIndex}-${index}-${wordIndex}`}
                  >
                    <AddWordDropdown
                      originalWord={word}
                      cleanWordText={cleanWordText}
                      wordInfo={wordInfo}
                      isLoadingInfo={isLoadingInfo}
                      onFetchWordInfo={handleFetchWordInfo}
                      onAddToVault={handleAddWordToVault}
                      userVaults={userVaults}
                      isAddingWord={isAddingWord}
                    />
                  </span>
                );
              }
            }
            return word;
          });
        }
        return part;
      });
    },
    [
      foundWords,
      wordInfoMap,
      loadingWords,
      handleAddToVault,
      handleAddWordToVault,
      handleFetchWordInfo,
    ]
  );

  // Memoizar a renderização do texto interativo
  const renderInteractiveText = useMemo(() => {
    if (shouldUseChunks && chunks.length > 0) {
      // Renderizar apenas os chunks visíveis
      return visibleChunks.map((chunkIndex) => (
        <div key={chunkIndex} className="text-chunk">
          {renderTextChunk(chunks[chunkIndex], chunkIndex)}
        </div>
      ));
    } else {
      // Renderização normal para textos menores
      return renderTextChunk(editContent);
    }
  }, [shouldUseChunks, chunks, visibleChunks, editContent, renderTextChunk]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto lg:px-6 px-2 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Carregando artigo...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!text) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Texto não encontrado
            </h1>
            <Button onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header fixo */}
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>

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
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Cabeçalho do artigo */}
        <header className="mb-8">
          {isEditing ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-3xl font-bold border-2 border-blue-300 focus:border-blue-500 mb-4"
              placeholder="Título do artigo"
            />
          ) : (
            <h1 className="text-[48px] font-sans emibold text-gray-900 dark:text-white mb-4 leading-tight">
              {text.title}
            </h1>
          )}

          <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }).format(new Date(text.createdAt))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                {Math.ceil(editContent.split(" ").length / 200)} min de leitura
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>{editContent.split(" ").length} palavras</span>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="flex gap-4 mb-6">
            <Badge variant="secondary" className="px-3 py-1">
              {foundWords.length} palavras nos vaults
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              {
                new Set(
                  foundWords.flatMap((fw) => fw.vaultInfo.map((v) => v.id))
                ).size
              }{" "}
              vaults
            </Badge>
          </div>
        </header>

        {/* Artigo principal */}
        <article className="prose prose-lg max-w-none dark:prose-invert">
          {isEditing ? (
            <div className="space-y-6">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-96 text-base leading-relaxed resize-none"
                placeholder="Digite ou cole o texto aqui..."
              />

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">
                  Preview com highlights:
                </h3>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border">
                  <div className="leading-relaxed text-gray-900 dark:text-gray-100">
                    {renderInteractiveText}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="dark:bg-gray-800 lg:p-0 p-2">
              <div
                className="leading-relaxed text-gray-900 dark:text-gray-100 text-lg"
                onScroll={shouldUseChunks ? handleScroll : undefined}
                style={
                  shouldUseChunks
                    ? { maxHeight: "70vh", overflowY: "auto" }
                    : undefined
                }
              >
                {renderInteractiveText}
                {shouldUseChunks && chunksLoading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-500">
                      Carregando mais conteúdo...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </article>

        {/* Palavras encontradas */}
        {foundWords.length > 0 && (
          <aside className="mt-12">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-green-600" />
                  Palavras dos seus Vaults
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {foundWords.map(({ word, vaultInfo }) => (
                    <div
                      key={word}
                      className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className="text-base px-3 py-1"
                        >
                          {word}
                        </Badge>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {vaultInfo.length} vault
                          {vaultInfo.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      {vaultInfo.map((vault) => (
                        <div key={vault.id} className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-white mb-1">
                            {vault.name}
                          </div>
                          {vault.words.map((vaultWord) => (
                            <div
                              key={vaultWord.id}
                              className="text-gray-600 dark:text-gray-400"
                            >
                              {vaultWord.translations.join(", ")}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        )}

        {/* Modal de Edição de Palavra */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Palavra</DialogTitle>
            </DialogHeader>
            {editingWord && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Palavra
                  </label>
                  <Input
                    value={editingWord.name}
                    disabled
                    className="mt-1 bg-gray-50 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Significados (separados por vírgula)
                  </label>
                  <Textarea
                    value={editTranslations}
                    onChange={(e) => setEditTranslations(e.target.value)}
                    className="mt-1"
                    placeholder="Ex: casa, lar, residência"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Classe Gramatical
                  </label>
                  <Input
                    value={editGrammaticalClass}
                    onChange={(e) => setEditGrammaticalClass(e.target.value)}
                    className="mt-1"
                    placeholder="Ex: substantivo, verbo, adjetivo"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nível de Confiança (1-5)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="5"
                    value={editConfidence}
                    onChange={(e) =>
                      setEditConfidence(parseInt(e.target.value))
                    }
                    className="mt-1"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveWordEdit}
                    disabled={isSaving}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
