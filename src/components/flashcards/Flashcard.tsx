"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  HelpCircle,
  Star,
  Zap,
  Target,
  Brain,
} from "lucide-react";
import { FlashcardWord } from "@/actions/flashcards";
import { FlashcardSkeleton } from "./FlashcardSkeleton";

interface FlashcardProps {
  word: FlashcardWord;
  showAnswer: boolean;
  onToggleAnswer: () => void;
  onAnswer: (confidence: number) => void;
}

export function Flashcard({
  word,
  showAnswer,
  onToggleAnswer,
  onAnswer,
}: FlashcardProps) {
  const [selectedConfidence, setSelectedConfidence] = useState<number | null>(
    null
  );

  // Verificação de segurança para evitar erros
  if (!word || !word.name) {
    return <FlashcardSkeleton />;
  }

  const confidenceLabels = {
    1: "Não lembro",
    2: "Difícil",
    3: "Bom",
    4: "Fácil",
  };

  const confidenceColors = {
    1: "bg-red-100 text-red-800 border-red-200",
    2: "bg-orange-100 text-orange-800 border-orange-200",
    3: "bg-green-100 text-green-800 border-green-200",
    4: "bg-blue-100 text-blue-800 border-blue-200",
  };

  const confidenceIcons = {
    1: <XCircle className="h-4 w-4" />,
    2: <HelpCircle className="h-4 w-4" />,
    3: <CheckCircle className="h-4 w-4" />,
    4: <Star className="h-4 w-4" />,
  };

  const handleConfidenceSelect = (confidence: number) => {
    setSelectedConfidence(confidence);
  };

  const handleSubmit = () => {
    if (selectedConfidence !== null) {
      onAnswer(selectedConfidence);
      setSelectedConfidence(null);
    }
  };

  const resetSelection = () => {
    setSelectedConfidence(null);
  };

  return (
    <div className="space-y-4">
      {/* Card Principal */}
      <Card className="min-h-[300px] flex flex-col">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            {word.grammaticalClass && (
              <Badge variant="outline" className="text-xs">
                {word.grammaticalClass}
              </Badge>
            )}
            {word.category && (
              <Badge variant="secondary" className="text-xs">
                {word.category}
              </Badge>
            )}
          </div>

          <CardTitle className="text-4xl font-bold text-gray-900 mb-4">
            {word.name}
          </CardTitle>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleAnswer}
            className="text-gray-500 hover:text-gray-700"
          >
            {showAnswer ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Ocultar Tradução
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Mostrar Tradução
              </>
            )}
          </Button>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-center">
          <div className="text-center space-y-4">
            {/* Traduções (só mostram quando showAnswer é true) */}
            {showAnswer && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-600">
                  Traduções:
                </h4>
                <div className="flex flex-wrap gap-2 justify-center">
                  {word.translations.map((translation, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-base px-3 py-1"
                    >
                      {translation}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Nível de Confiança - sempre visível */}
            <div className="pt-4">
              <h4 className="text-sm font-medium text-gray-600 mb-3">
                {showAnswer
                  ? "Como você se sente sobre esta palavra?"
                  : "Avalie seu conhecimento desta palavra:"}
              </h4>

              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                {[1, 2, 3, 4].map((confidence) => (
                  <Button
                    key={confidence}
                    variant={
                      selectedConfidence === confidence ? "default" : "outline"
                    }
                    className={`h-auto p-3 flex flex-col items-center gap-2 ${
                      selectedConfidence === confidence
                        ? "ring-2 ring-offset-2 ring-blue-500"
                        : ""
                    }`}
                    onClick={() => handleConfidenceSelect(confidence)}
                  >
                    <div className="flex items-center gap-2">
                      {
                        confidenceIcons[
                          confidence as keyof typeof confidenceIcons
                        ]
                      }
                      <span className="text-sm font-medium">
                        {
                          confidenceLabels[
                            confidence as keyof typeof confidenceLabels
                          ]
                        }
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        confidenceColors[
                          confidence as keyof typeof confidenceColors
                        ]
                      }`}
                    >
                      Nível {confidence}
                    </Badge>
                  </Button>
                ))}
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={resetSelection}
                  disabled={selectedConfidence === null}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Reavaliar
                </Button>

                <Button
                  onClick={handleSubmit}
                  disabled={selectedConfidence === null}
                  className="min-w-[120px]"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Confirmar
                </Button>
              </div>
            </div>

            {/* Dicas visuais (só mostram quando não há resposta) */}
            {!showAnswer && (
              <div className="flex items-center justify-center gap-4 text-gray-400 mt-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  <span className="text-sm">Pense na palavra</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  <span className="text-sm">Tente lembrar</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      {showAnswer && (
        <Card className="bg-gray-50">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm text-gray-600">
              <div>
                <div className="font-medium">Classe Gramatical</div>
                <div className="text-gray-800">{word.grammaticalClass}</div>
              </div>
              <div>
                <div className="font-medium">Categoria</div>
                <div className="text-gray-800">
                  {word.category || "Não definida"}
                </div>
              </div>
              <div>
                <div className="font-medium">Nível Atual</div>
                <div className="text-gray-800">Nível {word.confidence}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
