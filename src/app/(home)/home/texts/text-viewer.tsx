"use client";

import { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import {
  Text,
  checkTextWords,
  createWord,
  getVaults,
  updateText,
  updateWord,
  removeWordFromVault,
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
  Trash2,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  // Função para limpar palavra removendo caracteres especiais e pontuação
  const cleanWord = (word: string): string => {
    return word
      .replace(/[^\w\s]/g, "") // Remove tudo exceto letras, números e espaços
      .trim()
      .toLowerCase();
  };

  // Função para renderizar o texto com highlights interativos e palavras clicáveis
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
      const translations = editTranslations
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await updateWord(editingWord.id, {
        translations,
        grammaticalClass: editGrammaticalClass,
        confidence: editConfidence,
      });

      toast({
        title: "Sucesso",
        description: "Palavra atualizada com sucesso!",
      });

      // Recarregar dados
      const words = await checkTextWords(editContent);
      setFoundWords(words);

      setIsEditDialogOpen(false);
      setEditingWord(null);
    } catch (error) {
      console.error("Erro ao atualizar palavra:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar palavra",
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
        title: "Sucesso",
        description: `Palavra "${word}" removida do vault!`,
      });

      // Recarregar dados
      const words = await checkTextWords(editContent);
      setFoundWords(words);
    } catch (error) {
      console.error("Erro ao remover palavra:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover palavra do vault",
        variant: "destructive",
      });
    } finally {
      setIsAddingWord(false);
    }
  };

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
                  <span key={`chunk-${chunkIndex}-${index}-${wordIndex}`}>
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
    return renderTextChunk(editContent);
  }, [editContent, renderTextChunk]);

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
                    {renderInteractiveText}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="leading-relaxed text-gray-900 dark:text-gray-100">
                {renderInteractiveText}
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

      {/* Modal de edição de palavra */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Palavra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Significados:</label>
              <Textarea
                value={editTranslations}
                onChange={(e) => setEditTranslations(e.target.value)}
                placeholder="Digite os significados separados por vírgula"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Classe Gramatical:</label>
              <Input
                value={editGrammaticalClass}
                onChange={(e) => setEditGrammaticalClass(e.target.value)}
                placeholder="ex: substantivo, verbo, adjetivo"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nível de Confiança:</label>
              <Input
                type="number"
                min="1"
                max="5"
                value={editConfidence}
                onChange={(e) => setEditConfidence(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveWordEdit} disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
