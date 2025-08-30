"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressChart } from "@/components/ui/progress-chart";
import {
  Play,
  Pause,
  RotateCcw,
  BookOpen,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Brain,
  Trophy,
} from "lucide-react";
import {
  FlashcardWord,
  FlashcardSession,
  getFlashcardWords,
  createFlashcardSession,
  updateWordProgress,
  filterWordsForReview,
} from "@/actions/flashcards";
import { Flashcard } from "./Flashcard";
import { SessionSummary } from "./SessionSummary";
import { FlashcardDeckSkeleton } from "./FlashcardDeckSkeleton";
import { FlashcardSkeleton } from "./FlashcardSkeleton";

interface FlashcardDeckProps {
  vaultId: number;
  vaultName: string;
}

export function FlashcardDeck({ vaultId, vaultName }: FlashcardDeckProps) {
  const [words, setWords] = useState<FlashcardWord[]>([]);
  const [session, setSession] = useState<FlashcardSession | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [stats, setStats] = useState({
    totalWords: 0,
    wordsToReview: 0,
    newWords: 0,
    completedWords: 0,
  });

  useEffect(() => {
    loadWords();
  }, [vaultId]);

  const loadWords = async () => {
    try {
      setLoading(true);
      const flashcardWords = await getFlashcardWords(vaultId);
      const wordsForReview = await filterWordsForReview(flashcardWords);

      setWords(wordsForReview);
      setStats({
        totalWords: flashcardWords.length,
        wordsToReview: wordsForReview.length,
        newWords: flashcardWords.filter((w) => w.confidence === 1).length,
        completedWords: 0,
      });
    } catch (error) {
      console.error("Erro ao carregar palavras:", error);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    try {
      const newSession = await createFlashcardSession(vaultId);
      setSession(newSession);
      setIsSessionActive(true);
      setCurrentWordIndex(0);
      setShowAnswer(false);
    } catch (error) {
      console.error("Erro ao iniciar sessão:", error);
    }
  };

  const endSession = () => {
    if (session) {
      setSession({
        ...session,
        endTime: new Date(),
        completedWords: currentWordIndex,
      });
    }
    setIsSessionActive(false);
    setShowSummary(true);
    setShowAnswer(false);
  };

  const restartSession = () => {
    setShowSummary(false);
    setCurrentWordIndex(0);
    startSession();
  };

  const handleAnswer = async (confidence: number) => {
    if (currentWordIndex >= words.length) return;

    const currentWord = words[currentWordIndex];

    try {
      // Atualizar progresso da palavra
      await updateWordProgress(currentWord.id, confidence, 1);

      // Atualizar estatísticas
      setStats((prev) => ({
        ...prev,
        completedWords: prev.completedWords + 1,
      }));

      // Próxima palavra ou fim da sessão
      if (currentWordIndex + 1 < words.length) {
        setCurrentWordIndex((prev) => prev + 1);
        setShowAnswer(false);
      } else {
        // Sessão completa
        endSession();
      }
    } catch (error) {
      console.error("Erro ao atualizar progresso:", error);
    }
  };

  const nextWord = () => {
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex((prev) => prev + 1);
      setShowAnswer(false);
    }
  };

  const previousWord = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex((prev) => prev - 1);
      setShowAnswer(false);
    }
  };

  const toggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  if (loading) {
    return <FlashcardDeckSkeleton />;
  }

  if (words.length === 0) {
    return (
      <Card className="text-center p-8">
        <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          Nenhuma palavra para estudar
        </h3>
        <p className="text-gray-500">
          Este vault não possui palavras ou todas as palavras já foram revisadas
          recentemente.
        </p>
      </Card>
    );
  }

  if (showSummary && session) {
    return (
      <SessionSummary session={session} onRestartSession={restartSession} />
    );
  }

  if (!isSessionActive) {
    return (
      <div className="space-y-6">
        {/* Estatísticas do Deck */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-blue-600" />
              {vaultName} - Flashcards
            </CardTitle>
            <CardDescription>
              Sistema de repetição espaçada para memorização eficiente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalWords}
                </div>
                <div className="text-sm text-gray-600">Total de Palavras</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.wordsToReview}
                </div>
                <div className="text-sm text-gray-600">Para Revisar</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.newWords}
                </div>
                <div className="text-sm text-gray-600">Novas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.completedWords}
                </div>
                <div className="text-sm text-gray-600">Completadas</div>
              </div>
            </div>

            {/* Barra de Progresso */}
            {stats.totalWords > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Progresso Geral</span>
                  <span>
                    {Math.round(
                      (stats.completedWords / stats.totalWords) * 100
                    )}
                    %
                  </span>
                </div>
                <ProgressChart
                  value={(stats.completedWords / stats.totalWords) * 100}
                  className="h-3"
                  variant="default"
                />
              </div>
            )}

            {/* Mostrar primeira palavra como preview */}
            {words.length > 0 ? (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-600 mb-3">
                  Preview da primeira palavra:
                </h4>
                <Flashcard
                  word={words[0]}
                  showAnswer={false}
                  onToggleAnswer={() => {}}
                  onAnswer={() => {}}
                />
              </div>
            ) : (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-600 mb-3">
                  Preview da primeira palavra:
                </h4>
                <FlashcardSkeleton />
              </div>
            )}

            <Button onClick={startSession} className="w-full mt-6" size="lg">
              <Play className="h-5 w-5 mr-2" />
              Iniciar Sessão de Estudo
            </Button>
          </CardContent>
        </Card>

        {/* Informações sobre o Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Como Funciona
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-3">
              <Target className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <strong>Repetição Espaçada:</strong> Palavras são revisadas em
                intervalos otimizados para memorização
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <strong>Intervalos Inteligentes:</strong> Palavras difíceis
                aparecem mais frequentemente
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Trophy className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <strong>Progresso Adaptativo:</strong> O sistema se ajusta ao
                seu nível de conhecimento
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sessão ativa - mostrar flashcard atual
  const currentWord = words[currentWordIndex];
  const progress = ((currentWordIndex + 1) / words.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header da Sessão */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                {vaultName} - Sessão Ativa
              </CardTitle>
              <CardDescription>
                Palavra {currentWordIndex + 1} de {words.length}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={endSession}>
              <Pause className="h-4 w-4 mr-2" />
              Pausar
            </Button>
          </div>

          {/* Barra de Progresso da Sessão */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progresso da Sessão</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <ProgressChart value={progress} className="h-3" variant="success" />
          </div>
        </CardHeader>
      </Card>

      {/* Flashcard Atual */}
      <Flashcard
        word={currentWord}
        showAnswer={showAnswer}
        onToggleAnswer={toggleAnswer}
        onAnswer={handleAnswer}
      />

      {/* Navegação */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={previousWord}
          disabled={currentWordIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        <div className="text-sm text-gray-600">
          {currentWordIndex + 1} / {words.length}
        </div>

        <Button
          variant="outline"
          onClick={nextWord}
          disabled={currentWordIndex === words.length - 1}
        >
          Próxima
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Estatísticas da Sessão */}
      {session && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-blue-600">
                  {stats.completedWords}
                </div>
                <div className="text-xs text-gray-600">Completadas</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-orange-600">
                  {words.length - currentWordIndex - 1}
                </div>
                <div className="text-xs text-gray-600">Restantes</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600">
                  {Math.round((stats.completedWords / words.length) * 100)}%
                </div>
                <div className="text-xs text-gray-600">Taxa de Sucesso</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
