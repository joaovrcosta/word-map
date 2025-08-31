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
          getUserStats(),
          getUserSettings(),
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
  }, [updateSettings]);

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
      await upsertUserSettings(useAllVaults);
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
