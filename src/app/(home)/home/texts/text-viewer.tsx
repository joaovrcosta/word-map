"use client";

import { useState, useEffect } from "react";
import { Text, checkTextWords } from "@/actions/actions";
import { Vault, Word } from "@/actions/actions";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Target, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    const analyzeText = async () => {
      try {
        setIsLoading(true);
        // TODO: Pegar userId do contexto de autenticação
        const userId = 1; // Temporário
        const words = await checkTextWords(text.content, userId);
        setFoundWords(words);
      } catch (error) {
        console.error("Erro ao analisar texto:", error);
      } finally {
        setIsLoading(false);
      }
    };

    analyzeText();
  }, [text.content]);

  // Função para renderizar o texto com highlights
  const renderHighlightedText = () => {
    let highlightedContent = text.content;

    foundWords.forEach(({ word, vaultInfo }) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      highlightedContent = highlightedContent.replace(
        regex,
        `<span class="highlighted-word bg-yellow-200 dark:bg-yellow-800 px-1 rounded cursor-pointer" data-word="${word}">${word}</span>`
      );
    });

    return highlightedContent;
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

      {/* Texto com Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-yellow-600" />
            Texto Analisado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div
              className="leading-relaxed text-gray-900 dark:text-gray-100"
              dangerouslySetInnerHTML={{ __html: renderHighlightedText() }}
            />
          </div>

          {foundWords.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Info className="w-8 h-8 mx-auto mb-2" />
              <p>Nenhuma palavra dos seus vaults foi encontrada neste texto.</p>
              <p className="text-sm">
                Adicione mais palavras aos seus vaults para ver highlights aqui.
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
