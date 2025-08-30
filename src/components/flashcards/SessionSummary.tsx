"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Clock,
  Target,
  BookOpen,
  Star,
  TrendingUp,
  RotateCcw,
  Home,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { FlashcardSession } from "@/actions/flashcards";

interface SessionSummaryProps {
  session: FlashcardSession;
  onRestartSession: () => void;
}

export function SessionSummary({
  session,
  onRestartSession,
}: SessionSummaryProps) {
  const duration = session.endTime
    ? Math.round(
        (session.endTime.getTime() - session.startTime.getTime()) / 1000 / 60
      )
    : 0;

  const completionRate =
    session.totalWords > 0
      ? Math.round((session.completedWords / session.totalWords) * 100)
      : 0;

  const wordsPerMinute =
    duration > 0 ? Math.round(session.completedWords / duration) : 0;

  return (
    <div className="space-y-6">
      {/* Header de Parabéns */}
      <Card className="text-center bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="pt-8 pb-8">
          <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Sessão Concluída!
          </h2>
          <p className="text-lg text-gray-600">
            Parabéns! Você completou sua sessão de flashcards.
          </p>
        </CardContent>
      </Card>

      {/* Estatísticas da Sessão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Resumo da Sessão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <BookOpen className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <div className="text-2xl font-bold text-blue-600">
                {session.completedWords}
              </div>
              <div className="text-sm text-blue-600">Palavras Estudadas</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Clock className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <div className="text-2xl font-bold text-green-600">
                {duration}
              </div>
              <div className="text-sm text-green-600">Minutos</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <TrendingUp className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <div className="text-2xl font-bold text-purple-600">
                {completionRate}%
              </div>
              <div className="text-sm text-purple-600">Taxa de Conclusão</div>
            </div>

            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Star className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
              <div className="text-2xl font-bold text-yellow-600">
                {wordsPerMinute}
              </div>
              <div className="text-sm text-yellow-600">Palavras/min</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conquistas e Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Conquistas da Sessão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {session.completedWords >= 10 && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1">
                <Star className="h-3 w-3 mr-1" />
                Estudioso - 10+ palavras
              </Badge>
            )}

            {session.completedWords >= 25 && (
              <Badge className="bg-green-100 text-green-800 border-green-200 px-3 py-1">
                <Target className="h-3 w-3 mr-1" />
                Dedicado - 25+ palavras
              </Badge>
            )}

            {session.completedWords >= 50 && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 px-3 py-1">
                <Trophy className="h-3 w-3 mr-1" />
                Mestre - 50+ palavras
              </Badge>
            )}

            {duration <= 30 && session.completedWords >= 10 && (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200 px-3 py-1">
                <Clock className="h-3 w-3 mr-1" />
                Eficiente - Rápido e preciso
              </Badge>
            )}

            {completionRate === 100 && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 px-3 py-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Perfeito - 100% concluído
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Próximos Passos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Próximos Passos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              Continue seu progresso de aprendizado:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={onRestartSession}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <RotateCcw className="h-6 w-6" />
                <span>Repetir Sessão</span>
              </Button>

              <Link href="/home/flashcards">
                <Button
                  variant="outline"
                  className="w-full h-auto p-4 flex flex-col items-center gap-2"
                >
                  <BookOpen className="h-6 w-6" />
                  <span>Outros Vaults</span>
                </Button>
              </Link>

              <Link href="/home">
                <Button
                  variant="outline"
                  className="w-full h-auto p-4 flex flex-col items-center gap-2"
                >
                  <Home className="h-6 w-6" />
                  <span>Página Inicial</span>
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dicas para Próxima Sessão */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <h4 className="font-semibold text-gray-800">
              💡 Dica para a próxima sessão
            </h4>
            <p className="text-sm text-gray-600">
              {completionRate >= 80
                ? "Excelente trabalho! Considere adicionar novas palavras ao seu vault."
                : completionRate >= 60
                ? "Bom progresso! Continue praticando as palavras mais difíceis."
                : "Continue praticando! A repetição é a chave para a memorização."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

