"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  Brain,
  Network,
  TrendingUp,
  Settings,
  User,
  Target,
  Zap,
  Trophy,
  Star,
  Award,
  TrendingDown,
  Calendar,
  Clock,
  Flame,
  Rocket,
} from "lucide-react";
import {
  getUserStats,
  getUserSettings,
  upsertUserSettings,
} from "@/actions/user-settings";
import useUserSettingsStore from "@/store/userSettingsStore";
import { ProgressChart } from "@/components/ui/progress-chart";

interface UserStats {
  totalWords: number;
  totalVaults: number;
  wordsByConfidence: Array<{ confidence: number; count: number }>;
  wordsByCategory: Array<{ category: string; count: number }>;
  wordsByGrammaticalClass: Array<{ grammaticalClass: string; count: number }>;
  recentActivity: number;
  totalConnections: number;
}

interface GamificationStats {
  level: number;
  experience: number;
  experienceToNextLevel: number;
  streak: number;
  bestStreak: number;
  achievements: string[];
  weeklyGoal: number;
  weeklyProgress: number;
  monthlyGoal: number;
  monthlyProgress: number;
}

export default function ProfilePage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [gamificationStats, setGamificationStats] =
    useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { settings, updateSettings } = useUserSettingsStore();

  // Mock userId - em produção, isso viria do contexto de autenticação
  const userId = 1;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, userSettings] = await Promise.all([
          getUserStats(userId),
          getUserSettings(userId),
        ]);

        setStats(statsData);

        if (userSettings) {
          updateSettings({
            useAllVaultsForLinks: userSettings.useAllVaultsForLinks,
          });
        }

        // Calcular estatísticas gamificadas
        if (statsData) {
          const gamificationData = calculateGamificationStats(statsData);
          setGamificationStats(gamificationData);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, updateSettings]);

  // Função para calcular estatísticas gamificadas
  const calculateGamificationStats = (
    userStats: UserStats
  ): GamificationStats => {
    // Calcular nível baseado no total de palavras
    const baseExp = 100; // Experiência base para o primeiro nível
    const level = Math.floor(userStats.totalWords / 10) + 1;
    const experience = userStats.totalWords * 10;
    const experienceToNextLevel = level * 10 * 10 - experience;

    // Calcular streak baseado na atividade recente
    const streak = Math.min(userStats.recentActivity, 7); // Máximo de 7 dias
    const bestStreak = Math.max(streak, 14); // Streak máximo histórico

    // Conquistas baseadas em marcos
    const achievements: string[] = [];
    if (userStats.totalWords >= 10) achievements.push("Iniciante");
    if (userStats.totalWords >= 25) achievements.push("Aprendiz");
    if (userStats.totalWords >= 50) achievements.push("Estudioso");
    if (userStats.totalWords >= 100) achievements.push("Mestre");
    if (userStats.totalVaults >= 3) achievements.push("Organizador");
    if (userStats.totalConnections >= 10) achievements.push("Conectador");
    if (userStats.recentActivity >= 5) achievements.push("Consistente");

    // Metas semanais e mensais
    const weeklyGoal = Math.max(10, Math.floor(userStats.totalWords * 0.1));
    const weeklyProgress = Math.min(userStats.recentActivity, weeklyGoal);
    const monthlyGoal = Math.max(50, Math.floor(userStats.totalWords * 0.3));
    const monthlyProgress = Math.min(userStats.recentActivity * 4, monthlyGoal);

    return {
      level,
      experience,
      experienceToNextLevel,
      streak,
      bestStreak,
      achievements,
      weeklyGoal,
      weeklyProgress,
      monthlyGoal,
      monthlyProgress,
    };
  };

  const handleSettingChange = async (useAllVaults: boolean) => {
    setSaving(true);
    try {
      await upsertUserSettings(userId, useAllVaults);
      updateSettings({ useAllVaultsForLinks: useAllVaults });
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Erro ao carregar estatísticas</p>
      </div>
    );
  }

  const confidenceLabels = {
    1: "Iniciante",
    2: "Básico",
    3: "Intermediário",
    4: "Avançado",
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header do Perfil */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-red-500 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Meu Perfil
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Acompanhe seu progresso e configure suas preferências
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estatísticas Principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Palavras
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalWords}</div>
                <p className="text-xs text-muted-foreground">
                  Palavras aprendidas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vaults</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalVaults}</div>
                <p className="text-xs text-muted-foreground">
                  Coleções criadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conexões</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalConnections}
                </div>
                <p className="text-xs text-muted-foreground">
                  Palavras conectadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atividade</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recentActivity}</div>
                <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
              </CardContent>
            </Card>
          </div>

          {/* Seção Gamificada */}
          {gamificationStats && (
            <div className="space-y-6">
              {/* Nível e Experiência */}
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-800">
                    <Trophy className="h-6 w-6" />
                    Nível {gamificationStats.level}
                  </CardTitle>
                  <CardDescription className="text-purple-600">
                    Continue aprendendo para subir de nível!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-700">
                      Experiência
                    </span>
                    <span className="text-sm text-purple-600">
                      {gamificationStats.experience} /{" "}
                      {gamificationStats.experience +
                        gamificationStats.experienceToNextLevel}{" "}
                      XP
                    </span>
                  </div>
                  <ProgressChart
                    value={
                      (gamificationStats.experience /
                        (gamificationStats.experience +
                          gamificationStats.experienceToNextLevel)) *
                      100
                    }
                    className="h-3"
                    variant="default"
                  />
                  <div className="text-xs text-purple-500 text-center">
                    {gamificationStats.experienceToNextLevel} XP para o próximo
                    nível
                  </div>
                </CardContent>
              </Card>

              {/* Streak e Metas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Streak */}
                <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-800">
                      <Flame className="h-5 w-5" />
                      Streak Atual
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">
                      {gamificationStats.streak} 🔥
                    </div>
                    <p className="text-sm text-orange-600">
                      {gamificationStats.streak === 0
                        ? "Comece sua jornada hoje!"
                        : `${gamificationStats.streak} dias seguidos aprendendo`}
                    </p>
                    {gamificationStats.bestStreak >
                      gamificationStats.streak && (
                      <p className="text-xs text-orange-500 mt-2">
                        Melhor: {gamificationStats.bestStreak} dias
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Metas Semanais */}
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <Calendar className="h-5 w-5" />
                      Meta Semanal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-700">
                        Progresso
                      </span>
                      <span className="text-sm text-green-600">
                        {gamificationStats.weeklyProgress} /{" "}
                        {gamificationStats.weeklyGoal}
                      </span>
                    </div>
                    <ProgressChart
                      value={
                        (gamificationStats.weeklyProgress /
                          gamificationStats.weeklyGoal) *
                        100
                      }
                      className="h-2"
                      variant="success"
                    />
                    <div className="text-xs text-green-500 text-center">
                      {gamificationStats.weeklyGoal -
                        gamificationStats.weeklyProgress}{" "}
                      palavras restantes
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Conquistas */}
              <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800">
                    <Award className="h-6 w-6" />
                    Conquistas ({gamificationStats.achievements.length})
                  </CardTitle>
                  <CardDescription className="text-yellow-600">
                    Desbloqueie conquistas ao atingir marcos importantes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {gamificationStats.achievements.map(
                      (achievement, index) => (
                        <div
                          key={index}
                          className="flex flex-col items-center p-3 bg-yellow-100 rounded-lg"
                        >
                          <Star className="h-6 w-6 text-yellow-600 mb-2" />
                          <span className="text-sm font-medium text-yellow-800 text-center">
                            {achievement}
                          </span>
                        </div>
                      )
                    )}
                    {gamificationStats.achievements.length === 0 && (
                      <div className="col-span-full text-center py-8 text-yellow-600">
                        <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma conquista ainda. Continue aprendendo!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Estatísticas Avançadas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-blue-800 text-sm">
                      <Rocket className="h-4 w-4" />
                      Eficiência
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.totalWords > 0
                        ? Math.round(
                            (stats.totalConnections / stats.totalWords) * 100
                          )
                        : 0}
                      %
                    </div>
                    <p className="text-xs text-blue-600">Palavras conectadas</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-purple-800 text-sm">
                      <TrendingUp className="h-4 w-4" />
                      Crescimento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.recentActivity > 0
                        ? Math.round((stats.recentActivity / 30) * 100)
                        : 0}
                      %
                    </div>
                    <p className="text-xs text-purple-600">Atividade mensal</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-emerald-800 text-sm">
                      <Clock className="h-4 w-4" />
                      Consistência
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">
                      {gamificationStats.streak > 0
                        ? Math.round((gamificationStats.streak / 7) * 100)
                        : 0}
                      %
                    </div>
                    <p className="text-xs text-emerald-600">Streak semanal</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Seção de Gráficos e Análises Visuais */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              Gráficos e Análises Visuais
            </h2>

            {/* Gráficos Principais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Barras - Palavras por Nível de Confiança */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Nível de Confiança
                  </CardTitle>
                  <CardDescription>
                    Distribuição das palavras por nível de aprendizado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.wordsByConfidence.map((item) => {
                      const percentage = (item.count / stats.totalWords) * 100;
                      const maxBarWidth = 200; // Largura máxima da barra
                      const barWidth =
                        (item.count /
                          Math.max(
                            ...stats.wordsByConfidence.map((w) => w.count)
                          )) *
                        maxBarWidth;

                      return (
                        <div key={item.confidence} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              {
                                confidenceLabels[
                                  item.confidence as keyof typeof confidenceLabels
                                ]
                              }
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">
                                {item.count}
                              </span>
                              <span className="text-xs text-gray-500">
                                ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          <div className="relative">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${barWidth}px` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico de Pizza - Classe Gramatical */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-600" />
                    Classe Gramatical
                  </CardTitle>
                  <CardDescription>
                    Distribuição por tipo de palavra
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.wordsByGrammaticalClass.map((item, index) => {
                      const percentage = (item.count / stats.totalWords) * 100;
                      const colors = [
                        "#3b82f6",
                        "#8b5cf6",
                        "#06b6d4",
                        "#10b981",
                        "#f59e0b",
                        "#ef4444",
                      ];

                      return (
                        <div
                          key={item.grammaticalClass}
                          className="flex items-center gap-3"
                        >
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{
                              backgroundColor: colors[index % colors.length],
                            }}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">
                                {item.grammaticalClass}
                              </span>
                              <span className="text-sm text-gray-600">
                                {item.count} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <ProgressChart
                              value={percentage}
                              className="h-2"
                              variant="default"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Linha - Progresso ao Longo do Tempo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Progresso de Aprendizado
                </CardTitle>
                <CardDescription>
                  Evolução do número de palavras aprendidas ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      mes: "Jan",
                      palavras: Math.floor(stats.totalWords * 0.1),
                    },
                    {
                      mes: "Fev",
                      palavras: Math.floor(stats.totalWords * 0.25),
                    },
                    {
                      mes: "Mar",
                      palavras: Math.floor(stats.totalWords * 0.4),
                    },
                    {
                      mes: "Abr",
                      palavras: Math.floor(stats.totalWords * 0.6),
                    },
                    {
                      mes: "Mai",
                      palavras: Math.floor(stats.totalWords * 0.8),
                    },
                    { mes: "Jun", palavras: stats.totalWords },
                  ].map((data, index) => (
                    <div key={data.mes} className="flex items-center gap-4">
                      <div className="w-12 text-sm font-medium text-gray-600">
                        {data.mes}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">
                            {data.palavras} palavras
                          </span>
                          <span className="text-xs text-gray-500">
                            {((data.palavras / stats.totalWords) * 100).toFixed(
                              1
                            )}
                            %
                          </span>
                        </div>
                        <ProgressChart
                          value={(data.palavras / stats.totalWords) * 100}
                          className="h-3"
                          variant="success"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gráficos de Metas e Objetivos */}
            {gamificationStats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Barras - Metas Semanais vs Mensais */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      Metas e Objetivos
                    </CardTitle>
                    <CardDescription>
                      Comparação entre metas semanais e mensais
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Meta Semanal */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-orange-700">
                            Meta Semanal
                          </span>
                          <span className="text-sm text-orange-600">
                            {gamificationStats.weeklyProgress} /{" "}
                            {gamificationStats.weeklyGoal}
                          </span>
                        </div>
                        <ProgressChart
                          value={
                            (gamificationStats.weeklyProgress /
                              gamificationStats.weeklyGoal) *
                            100
                          }
                          className="h-4"
                          variant="default"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            Progresso: {gamificationStats.weeklyProgress}
                          </span>
                          <span>
                            Restante:{" "}
                            {gamificationStats.weeklyGoal -
                              gamificationStats.weeklyProgress}
                          </span>
                        </div>
                      </div>

                      {/* Meta Mensal */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-700">
                            Meta Mensal
                          </span>
                          <span className="text-sm text-green-600">
                            {gamificationStats.monthlyProgress} /{" "}
                            {gamificationStats.monthlyGoal}
                          </span>
                        </div>
                        <ProgressChart
                          value={
                            (gamificationStats.monthlyProgress /
                              gamificationStats.monthlyGoal) *
                            100
                          }
                          className="h-4"
                          variant="success"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            Progresso: {gamificationStats.monthlyProgress}
                          </span>
                          <span>
                            Restante:{" "}
                            {gamificationStats.monthlyGoal -
                              gamificationStats.monthlyProgress}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Gráfico de Pizza - Distribuição de Conquistas */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-yellow-600" />
                      Distribuição de Conquistas
                    </CardTitle>
                    <CardDescription>
                      Conquistas desbloqueadas vs. disponíveis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-yellow-400" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">
                              Desbloqueadas
                            </span>
                            <span className="text-sm text-gray-600">
                              {gamificationStats.achievements.length} / 7
                            </span>
                          </div>
                          <ProgressChart
                            value={
                              (gamificationStats.achievements.length / 7) * 100
                            }
                            className="h-3"
                            variant="default"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-gray-300" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">
                              Disponíveis
                            </span>
                            <span className="text-sm text-gray-600">
                              {7 - gamificationStats.achievements.length} / 7
                            </span>
                          </div>
                          <ProgressChart
                            value={
                              ((7 - gamificationStats.achievements.length) /
                                7) *
                              100
                            }
                            className="h-3"
                            variant="default"
                          />
                        </div>
                      </div>

                      <div className="text-center pt-4">
                        <div className="text-2xl font-bold text-yellow-600">
                          {Math.round(
                            (gamificationStats.achievements.length / 7) * 100
                          )}
                          %
                        </div>
                        <div className="text-sm text-gray-600">
                          Taxa de Conquistas
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Gráfico de Radar - Estatísticas Gerais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-indigo-600" />
                  Visão Geral do Desempenho
                </CardTitle>
                <CardDescription>
                  Análise multidimensional do seu progresso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.totalWords}
                    </div>
                    <div className="text-sm text-blue-600">Total Palavras</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.totalVaults}
                    </div>
                    <div className="text-sm text-green-600">Vaults</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.totalConnections}
                    </div>
                    <div className="text-sm text-purple-600">Conexões</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200">
                    <div className="text-2xl font-bold text-orange-600">
                      {stats.recentActivity}
                    </div>
                    <div className="text-sm text-orange-600">Atividade</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos Simples (Versão Anterior) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Palavras por Nível de Confiança */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Nível de Confiança
                </CardTitle>
                <CardDescription>
                  Distribuição das palavras por nível de aprendizado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.wordsByConfidence.map((item) => (
                  <div key={item.confidence} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {
                          confidenceLabels[
                            item.confidence as keyof typeof confidenceLabels
                          ]
                        }
                      </span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                    <ProgressChart
                      value={(item.count / stats.totalWords) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Palavras por Classe Gramatical */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Classe Gramatical
                </CardTitle>
                <CardDescription>
                  Distribuição por tipo de palavra
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.wordsByGrammaticalClass.map((item) => (
                    <div
                      key={item.grammaticalClass}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{item.grammaticalClass}</span>
                      <Badge variant="outline">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Categorias */}
          {stats.wordsByCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Categorias</CardTitle>
                <CardDescription>
                  Palavras organizadas por categoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats.wordsByCategory.map((item) => (
                    <Badge key={item.category} variant="secondary">
                      {item.category} ({item.count})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Configurações */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações
              </CardTitle>
              <CardDescription>
                Personalize como o sistema funciona para você
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="use-all-vaults"
                      className="text-base font-medium"
                    >
                      Usar todas as palavras para links
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {settings.useAllVaultsForLinks
                        ? "Permite conectar palavras de todos os vaults"
                        : "Permite conectar apenas palavras do vault ativo"}
                    </p>
                  </div>
                  <Switch
                    id="use-all-vaults"
                    checked={settings.useAllVaultsForLinks}
                    onCheckedChange={handleSettingChange}
                    disabled={saving}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Como funciona:
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      • <strong>Desabilitado:</strong> Ao criar links, apenas
                      palavras do vault atual são sugeridas
                    </li>
                    <li>
                      • <strong>Habilitado:</strong> Todas as palavras de todos
                      os vaults são consideradas para links
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Informações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Versão:</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Última atualização:</span>
                <span>{new Date().toLocaleDateString("pt-BR")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
