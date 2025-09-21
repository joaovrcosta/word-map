"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Plus, Trash2, Save, BookOpen, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWords } from "@/hooks/use-words";
import { type Word } from "@/actions/actions";
import { translateToPortuguese } from "@/lib/translate";

interface WordItem {
  id: string;
  word: Word;
  position: number;
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

  const { words, isLoading } = useWords();
  const dropZoneRef = useRef<HTMLDivElement>(null);

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

  // Carregar frase salva
  const loadSentence = (sentence: Sentence) => {
    setSentenceWords(sentence.words);
    setNotes(sentence.notes);
    setSelectedSentence(sentence);
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
                    frase
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sentenceWords
                    .sort((a, b) => a.position - b.position)
                    .map((wordItem) => (
                      <Badge
                        key={wordItem.id}
                        variant="secondary"
                        className="px-3 !h-12 py-1 cursor-pointer text-lg bg-white border-b-[4px] border-[##e5e5e5] !rounded-[12px] transition-colors"
                        onClick={() => removeWordFromSentence(wordItem.id)}
                      >
                        {wordItem.word.name}
                        <Trash2 size={12} className="ml-2" />
                      </Badge>
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

            <Textarea
              placeholder="Faça suas anotações sobre esta frase..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-64 resize-none"
            />

            {sentenceWords.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Palavras na frase:
                </h4>
                <div className="space-y-1">
                  {sentenceWords
                    .sort((a, b) => a.position - b.position)
                    .map((wordItem) => (
                      <div key={wordItem.id} className="text-sm">
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
                    ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
