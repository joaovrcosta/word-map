"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  BookOpen,
  Target,
  Zap,
  Clock,
  Star,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { getVaults, type Vault } from "@/actions/actions";

export default function FlashcardsPage() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [vaultStats, setVaultStats] = useState<
    Record<
      number,
      {
        totalWords: number;
        wordsToReview: number;
        newWords: number;
        masteredWords: number;
      }
    >
  >({});

  useEffect(() => {
    loadVaults();
  }, []);

  const loadVaults = async () => {
    try {
      setLoading(true);
      const vaultsData = await getVaults();
      setVaults(vaultsData);

      // Calcular estatísticas para cada vault
      const stats: Record<number, any> = {};

      for (const vault of vaultsData) {
        const wordsToReview = vault.words.filter((w) => w.confidence <= 2);
        stats[vault.id] = {
          totalWords: vault.words.length,
          wordsToReview: wordsToReview.length,
          newWords: vault.words.filter((w) => w.confidence === 1).length,
          masteredWords: vault.words.filter((w) => w.confidence === 4).length,
        };
      }

      setVaultStats(stats);
    } catch (error) {
      console.error("Erro ao carregar vaults:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Brain className="h-12 w-12 text-purple-600" />
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Flashcards
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Sistema de repetição espaçada para memorização eficiente
            </p>
          </div>
        </div>
      </div>

      {/* Como Funciona */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Como Funciona o Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-3">
              <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800">
                Repetição Espaçada
              </h3>
              <p className="text-sm text-gray-600">
                Palavras são revisadas em intervalos otimizados baseados na sua
                dificuldade
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-800">
                Progresso Adaptativo
              </h3>
              <p className="text-sm text-gray-600">
                O sistema se adapta ao seu nível de conhecimento de cada palavra
              </p>
            </div>

            <div className="text-center space-y-3">
              <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto flex items-center justify-center">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-800">Foco Inteligente</h3>
              <p className="text-sm text-gray-600">
                Prioriza palavras difíceis e mantém palavras dominadas em
                revisão
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selecionar Vault */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Selecione um Vault para Estudar
        </h2>

        {vaults.length === 0 ? (
          <Card className="text-center p-8">
            <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              Nenhum vault encontrado
            </h3>
            <p className="text-gray-500 mb-4">
              Crie um vault e adicione palavras para começar a estudar com
              flashcards
            </p>
            <Link href="/home/vault">
              <Button>
                <BookOpen className="h-4 w-4 mr-2" />
                Criar Vault
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vaults.map((vault) => {
              const stats = vaultStats[vault.id] || {
                totalWords: 0,
                wordsToReview: 0,
                newWords: 0,
                masteredWords: 0,
              };

              return (
                <Card
                  key={vault.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-blue-600" />
                          {vault.name}
                        </CardTitle>
                        <CardDescription>
                          {stats.totalWords} palavras • Criado em{" "}
                          {new Date(vault.createdAt).toLocaleDateString(
                            "pt-BR"
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Estatísticas */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <div className="text-lg font-bold text-orange-600">
                          {stats.wordsToReview}
                        </div>
                        <div className="text-xs text-orange-600">
                          Para Revisar
                        </div>
                      </div>

                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {stats.newWords}
                        </div>
                        <div className="text-xs text-green-600">Novas</div>
                      </div>

                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">
                          {stats.masteredWords}
                        </div>
                        <div className="text-xs text-blue-600">Dominadas</div>
                      </div>

                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-600">
                          {stats.totalWords}
                        </div>
                        <div className="text-xs text-purple-600">Total</div>
                      </div>
                    </div>

                    {/* Indicadores de Status */}
                    <div className="space-y-2">
                      {stats.wordsToReview > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-orange-100 text-orange-800 border-orange-200"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          {stats.wordsToReview} palavras para revisar
                        </Badge>
                      )}

                      {stats.newWords > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-800 border-green-200"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          {stats.newWords} palavras novas
                        </Badge>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="space-y-2">
                      <Link href={`/home/vault/${vault.id}/flashcards`}>
                        <Button
                          className="w-full"
                          disabled={stats.totalWords === 0}
                        >
                          <Brain className="h-4 w-4 mr-2" />
                          Estudar Flashcards
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>

                      <Link href={`/home/vault/${vault.id}`}>
                        <Button variant="outline" className="w-full" size="sm">
                          Ver Detalhes do Vault
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dicas de Estudo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Dicas para Estudar Melhor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Sessões Eficazes</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Estude por 15-30 minutos diários</li>
                <li>• Mantenha consistência</li>
                <li>• Foque nas palavras mais difíceis</li>
                <li>• Use o sistema de confiança honestamente</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Sistema de Níveis</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • <span className="text-red-600">Nível 1:</span> Não lembro -
                  revisão diária
                </li>
                <li>
                  • <span className="text-orange-600">Nível 2:</span> Difícil -
                  revisão frequente
                </li>
                <li>
                  • <span className="text-green-600">Nível 3:</span> Bom -
                  revisão a cada 3 dias
                </li>
                <li>
                  • <span className="text-blue-600">Nível 4:</span> Fácil -
                  revisão semanal
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
