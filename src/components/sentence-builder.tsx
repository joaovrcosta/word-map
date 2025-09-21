"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  Trash2,
  Save,
  BookOpen,
  Globe,
  GripVertical,
  Palette,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWords } from "@/hooks/use-words";
import { type Word } from "@/actions/actions";
import { translateToPortuguese } from "@/lib/translate";

interface WordItem {
  id: string;
  word: Word;
  position: number;
  highlightColor?: string;
}

interface ExternalWord {
  id: string;
  name: string;
  translations: string[];
  grammaticalClass: string;
  isExternal: true;
}

interface Sentence {
  id: string;
  words: WordItem[];
  notes: string;
  createdAt: Date;
}

export function SentenceBuilder() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredWords, setFilteredWords] = useState<(Word | ExternalWord)[]>(
    []
  );
  const [sentenceWords, setSentenceWords] = useState<WordItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [savedSentences, setSavedSentences] = useState<Sentence[]>([]);
  const [selectedSentence, setSelectedSentence] = useState<Sentence | null>(
    null
  );
  const [draggedWord, setDraggedWord] = useState<WordItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [contextMenuWordId, setContextMenuWordId] = useState<string | null>(
    null
  );
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Estados para sistema de menções
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionPosition, setMentionPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);

  const { words, isLoading } = useWords();
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cores predefinidas para destacar palavras
  const highlightColors = [
    { name: "Padrão", value: "", bg: "bg-gray-100", text: "text-gray-800" },
    { name: "Vermelho", value: "red", bg: "bg-red-100", text: "text-red-800" },
    { name: "Azul", value: "blue", bg: "bg-blue-100", text: "text-blue-800" },
    {
      name: "Verde",
      value: "green",
      bg: "bg-green-100",
      text: "text-green-800",
    },
    {
      name: "Amarelo",
      value: "yellow",
      bg: "bg-yellow-100",
      text: "text-yellow-800",
    },
    {
      name: "Roxo",
      value: "purple",
      bg: "bg-purple-100",
      text: "text-purple-800",
    },
    { name: "Rosa", value: "pink", bg: "bg-pink-100", text: "text-pink-800" },
    {
      name: "Laranja",
      value: "orange",
      bg: "bg-orange-100",
      text: "text-orange-800",
    },
  ];

  // Função para fechar menu de contexto
  const closeContextMenu = () => {
    setContextMenuWordId(null);
    setContextMenuPosition(null);
  };

  // Fechar menu de contexto ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      closeContextMenu();
    };

    if (contextMenuWordId) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenuWordId]);

  // Fechar menu de contexto e dropdown de menção ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuWordId(null);
      setContextMenuPosition(null);
      setShowMentionDropdown(false);
    };

    if (contextMenuWordId || showMentionDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenuWordId, showMentionDropdown]);

  // Fechar dropdown quando sair do modo de edição
  useEffect(() => {
    if (!isEditingNotes) {
      setShowMentionDropdown(false);
      setMentionQuery("");
    }
  }, [isEditingNotes]);

  // Filtrar palavras baseado na pesquisa
  useEffect(() => {
    if (!words || searchTerm.length < 2) {
      setFilteredWords([]);
      return;
    }

    setIsSearching(true);

    // Filtrar palavras do vault atual
    const vaultWords = words
      .filter(
        (word) =>
          word.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          word.translations.some((translation) =>
            translation.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
      .slice(0, 10); // Limitar a 10 resultados do vault

    // Adicionar palavra externa se não encontrada no vault
    const searchLower = searchTerm.toLowerCase();
    const isInVault = vaultWords.some(
      (word) => word.name.toLowerCase() === searchLower
    );

    let externalWord: ExternalWord | null = null;
    if (!isInVault && searchTerm.length >= 2) {
      externalWord = {
        id: `external-${searchTerm}`,
        name: searchTerm,
        translations: [],
        grammaticalClass: "substantivo", // Default
        isExternal: true,
      };
    }

    const allResults: (Word | ExternalWord)[] = [...vaultWords];
    if (externalWord) {
      allResults.push(externalWord);
    }

    setFilteredWords(allResults);
    setIsSearching(false);
  }, [searchTerm, words]);

  // Adicionar palavra à frase
  const addWordToSentence = async (word: Word | ExternalWord) => {
    let wordToAdd: Word;

    // Se for palavra externa, traduzir automaticamente
    if ("isExternal" in word && word.isExternal) {
      setIsTranslating(true);
      try {
        const translation = await translateToPortuguese(word.name);
        wordToAdd = {
          id: parseInt(word.id.replace("external-", "")),
          name: word.name,
          translations: [translation],
          grammaticalClass: word.grammaticalClass,
          category: null,
          confidence: 1,
          isSaved: false,
          frequency: 0,
          vaultId: 0, // Será definido quando salvar
          createdAt: new Date(),
        };
      } catch (error) {
        console.warn("Erro ao traduzir palavra:", error);
        // Usar palavra sem tradução se falhar
        wordToAdd = {
          id: parseInt(word.id.replace("external-", "")),
          name: word.name,
          translations: [],
          grammaticalClass: word.grammaticalClass,
          category: null,
          confidence: 1,
          isSaved: false,
          frequency: 0,
          vaultId: 0,
          createdAt: new Date(),
        };
      }
      setIsTranslating(false);
    } else {
      wordToAdd = word as Word;
    }

    const newWordItem: WordItem = {
      id: `${wordToAdd.id}-${Date.now()}`,
      word: wordToAdd,
      position: sentenceWords.length,
    };

    setSentenceWords((prev) => [...prev, newWordItem]);
    setSearchTerm("");
    setFilteredWords([]);
  };

  // Remover palavra da frase
  const removeWordFromSentence = (wordId: string) => {
    setSentenceWords((prev) => {
      const filtered = prev.filter((w) => w.id !== wordId);
      // Reordenar posições
      return filtered.map((w, index) => ({ ...w, position: index }));
    });
  };

  // Limpar frase atual
  const clearSentence = () => {
    setSentenceWords([]);
    setNotes("");
    setSelectedSentence(null);
  };

  // Salvar frase
  const saveSentence = () => {
    if (sentenceWords.length === 0) return;

    const newSentence: Sentence = {
      id: `sentence-${Date.now()}`,
      words: [...sentenceWords],
      notes,
      createdAt: new Date(),
    };

    setSavedSentences((prev) => [newSentence, ...prev]);
    clearSentence();
  };

  // Função para renderizar texto com menções destacadas
  const renderTextWithMentions = (text: string) => {
    if (!text) return [];

    // Regex para encontrar @palavra
    const regex = /@(\w+)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // É uma palavra após @
        return {
          type: "mention",
          content: part,
          key: index,
        };
      }
      return {
        type: "text",
        content: part,
        key: index,
      };
    });
  };

  // Função para calcular posição do dropdown de menção
  const calculateMentionPosition = (
    textarea: HTMLTextAreaElement,
    cursorPosition: number,
    notes: string
  ) => {
    const rect = textarea.getBoundingClientRect();
    const lines = notes.substring(0, cursorPosition).split("\n").length - 1;
    const LINE_HEIGHT = 20;

    return {
      x: rect.left,
      y: rect.top + lines * LINE_HEIGHT + LINE_HEIGHT,
    };
  };

  // Função para preparar dados para o dropdown de menção
  const getMentionOptions = (mentionQuery: string) => {
    return sentenceWords
      .sort((a, b) => a.position - b.position)
      .filter((wordItem) =>
        wordItem.word.name.toLowerCase().includes(mentionQuery.toLowerCase())
      )
      .map((wordItem) => ({
        name: wordItem.word.name,
        translations: wordItem.word.translations.join(", "),
      }));
  };

  // Função para lidar com mudanças no textarea
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setNotes(value);
    setCursorPosition(cursorPos);

    // Verificar se acabou de digitar "@"
    if (cursorPos > 0 && value[cursorPos - 1] === "@") {
      // Verificar se é início de linha ou após espaço
      if (cursorPos === 1 || value[cursorPos - 2] === " ") {
        const position = calculateMentionPosition(e.target, cursorPos, notes);
        setMentionPosition(position);
        setMentionQuery("");
        setShowMentionDropdown(true);
      }
    } else if (showMentionDropdown) {
      // Se já está mostrando dropdown, verificar se ainda está digitando após @
      const textBeforeCursor = value.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
          setMentionQuery(textAfterAt);
          const position = calculateMentionPosition(
            e.target,
            lastAtIndex,
            notes
          );
          setMentionPosition(position);
        } else {
          setShowMentionDropdown(false);
        }
      } else {
        setShowMentionDropdown(false);
      }
    }
  };

  // Função para inserir menção
  const handleInsertMention = (wordName: string) => {
    const beforeCursor = notes.substring(0, cursorPosition);
    const afterCursor = notes.substring(cursorPosition);

    // Encontrar a posição do último @
    const lastAtIndex = beforeCursor.lastIndexOf("@");
    if (lastAtIndex === -1) return;

    const beforeAt = beforeCursor.substring(0, lastAtIndex);
    const newText = beforeAt + `@${wordName} ` + afterCursor;

    setNotes(newText);
    setShowMentionDropdown(false);
    setMentionQuery("");

    // Focar no textarea novamente
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeAt.length + wordName.length + 2; // +2 para incluir @ e espaço
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Função para lidar com teclas pressionadas
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      if (showMentionDropdown) {
        setShowMentionDropdown(false);
        setMentionQuery("");
      } else if (isEditingNotes) {
        setIsEditingNotes(false);
      }
    }
  };

  // Carregar frase salva
  const loadSentence = (sentence: Sentence) => {
    setSentenceWords(sentence.words);
    setNotes(sentence.notes);
    setSelectedSentence(sentence);
  };

  // Funções de drag and drop
  const handleDragStart = (e: React.DragEvent, wordItem: WordItem) => {
    setDraggedWord(wordItem);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", wordItem.id);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (!draggedWord) return;

    setSentenceWords((prev) => {
      const sortedWords = [...prev].sort((a, b) => a.position - b.position);
      const draggedIndex = sortedWords.findIndex(
        (w) => w.id === draggedWord.id
      );

      if (draggedIndex === -1) return prev;

      // Remove o item arrastado
      const [draggedItem] = sortedWords.splice(draggedIndex, 1);

      // Insere na nova posição
      sortedWords.splice(dropIndex, 0, draggedItem);

      // Reordena as posições
      return sortedWords.map((word, index) => ({
        ...word,
        position: index,
      }));
    });

    setDraggedWord(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedWord(null);
    setDragOverIndex(null);
  };

  // Função para lidar com clique direito
  const handleRightClick = (e: React.MouseEvent, wordId: string) => {
    e.preventDefault();
    setContextMenuWordId(wordId);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  // Função para remover palavra (com fechamento do menu)
  const removeWordWithMenu = (wordId: string) => {
    removeWordFromSentence(wordId);
    closeContextMenu();
  };

  // Função para alterar cor de destaque
  const changeWordColor = (wordId: string, color: string) => {
    setSentenceWords((prev) =>
      prev.map((word) =>
        word.id === wordId ? { ...word, highlightColor: color } : word
      )
    );
    setEditingWordId(null);
    closeContextMenu();
  };

  // Função para obter classes CSS da cor
  const getColorClasses = (color: string) => {
    const colorConfig = highlightColors.find((c) => c.value === color);
    return colorConfig
      ? `${colorConfig.bg} ${colorConfig.text}`
      : "bg-gray-100 text-gray-800";
  };

  // Gerar texto da frase
  const sentenceText = sentenceWords
    .sort((a, b) => a.position - b.position)
    .map((w) => w.word.name)
    .join(" ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Construtor de Frases
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pesquise palavras do vault ou digite palavras novas para construir
            frases
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={clearSentence}
            disabled={sentenceWords.length === 0}
          >
            <Trash2 size={16} className="mr-2" />
            Limpar
          </Button>
          <Button onClick={saveSentence} disabled={sentenceWords.length === 0}>
            <Save size={16} className="mr-2" />
            Salvar Frase
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Pesquisa de Palavras */}
        <div className="space-y-4">
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
                    onClick={() => addWordToSentence(word)}
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

          {/* Frases Salvas */}
          {savedSentences.length > 0 && (
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                Frases Salvas
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {savedSentences.map((sentence) => (
                  <div
                    key={sentence.id}
                    className="p-2 border rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    onClick={() => loadSentence(sentence)}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {sentence.words.map((w) => w.word.name).join(" ")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {sentence.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Coluna 2: Área de Construção da Frase */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              Sua Frase
            </h3>

            {/* Área de drop para palavras */}
            <div
              ref={dropZoneRef}
              className="min-h-32 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              {sentenceWords.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                  <p>
                    Arraste palavras aqui ou clique nelas para construir sua
                    frase.
                    <br />
                    <span className="text-sm opacity-75">
                      Você pode arrastar e reordenar as palavras na frase
                    </span>
                    <br />
                    <span className="text-sm opacity-75">
                      Clique com botão direito para opções
                    </span>
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sentenceWords
                    .sort((a, b) => a.position - b.position)
                    .map((wordItem, index) => (
                      <div
                        key={wordItem.id}
                        className={`relative ${
                          dragOverIndex === index
                            ? "ring-2 ring-blue-500 ring-opacity-50"
                            : ""
                        }`}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                      >
                        <Badge
                          variant="secondary"
                          className={`px-3 !h-12 py-1 text-lg border-b-[4px] border-[#e5e5e5] !rounded-[12px] transition-colors hover:shadow-md ${getColorClasses(
                            wordItem.highlightColor || ""
                          )}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, wordItem)}
                          onDragEnd={handleDragEnd}
                          onContextMenu={(e) =>
                            handleRightClick(e, wordItem.id)
                          }
                        >
                          <GripVertical
                            size={12}
                            className="mr-1 text-gray-400"
                          />
                          {wordItem.word.name}
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Texto da frase */}
            {sentenceText && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-lg font-medium text-blue-900 dark:text-blue-100">
                  "{sentenceText}"
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Coluna 3: Anotações */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">
              Anotações
            </h3>

            {/* Sistema de anotações com modo de edição */}
            <div className="space-y-2">
              {isEditingNotes ? (
                // Modo de edição - mostra textarea
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Editando anotações:
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingNotes(false)}
                      className="text-xs"
                    >
                      Salvar
                    </Button>
                  </div>
                  <Textarea
                    ref={textareaRef}
                    placeholder="Faça suas anotações sobre esta frase... Digite @ para referenciar palavras"
                    value={notes}
                    onChange={handleNotesChange}
                    onKeyDown={handleKeyDown}
                    className="min-h-64 resize-none"
                  />
                </div>
              ) : (
                // Modo de visualização - mostra preview
                <div
                  className="min-h-64 p-3 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                  onClick={() => setIsEditingNotes(true)}
                >
                  {notes ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Anotações:
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingNotes(true);
                          }}
                          className="text-xs"
                        >
                          Editar
                        </Button>
                      </div>
                      <div className="text-sm leading-6 whitespace-pre-wrap break-words">
                        {renderTextWithMentions(notes).map((part) => {
                          if (part.type === "mention") {
                            return (
                              <span
                                key={part.key}
                                className="px-1 py-0.5 rounded bg-blue-500 text-white font-medium"
                              >
                                @{part.content}
                              </span>
                            );
                          }
                          return part.content;
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <p className="text-sm">
                          Clique para adicionar anotações
                        </p>
                        <p className="text-xs mt-1">
                          Digite @ para referenciar palavras
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {sentenceWords.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Palavras na frase:
                </h4>
                <div className="space-y-2">
                  {sentenceWords
                    .sort((a, b) => a.position - b.position)
                    .map((wordItem) => (
                      <div
                        key={wordItem.id}
                        className={`flex items-center justify-between p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${getColorClasses(
                          wordItem.highlightColor || ""
                        )}`}
                        onContextMenu={(e) => handleRightClick(e, wordItem.id)}
                      >
                        <div className="text-sm flex-1">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {wordItem.word.name}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400 ml-2">
                            - {wordItem.word.translations.join(", ")}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({wordItem.word.grammaticalClass})
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Clique direito para opções
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Menu de Contexto */}
      {contextMenuWordId && contextMenuPosition && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[200px]"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
        >
          <div className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
            Opções da palavra
          </div>

          {/* Opções de cores */}
          <div className="px-3 py-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Destacar com cor:
            </div>
            <div className="flex flex-wrap gap-1">
              {highlightColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() =>
                    changeWordColor(contextMenuWordId, color.value)
                  }
                  className={`w-6 h-6 rounded-full border-2 ${
                    sentenceWords.find((w) => w.id === contextMenuWordId)
                      ?.highlightColor === color.value
                      ? "border-gray-800"
                      : "border-gray-300"
                  } ${color.bg}`}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* Opção de excluir */}
          <button
            onClick={() => removeWordWithMenu(contextMenuWordId)}
            className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
          >
            <Trash2 size={14} />
            Excluir palavra
          </button>
        </div>
      )}

      {/* Dropdown de menção */}
      {showMentionDropdown && mentionPosition && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[200px] max-h-48 overflow-y-auto"
          style={{
            left: mentionPosition.x,
            top: mentionPosition.y,
          }}
        >
          <div className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
            Selecionar palavra:
          </div>
          {getMentionOptions(mentionQuery).length > 0 ? (
            getMentionOptions(mentionQuery).map((option, index) => (
              <button
                key={index}
                onClick={() => handleInsertMention(option.name)}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <span className="font-medium">{option.name}</span>
                <span className="text-xs text-gray-500">
                  - {option.translations}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              Nenhuma palavra encontrada
            </div>
          )}
        </div>
      )}
    </div>
  );
}
