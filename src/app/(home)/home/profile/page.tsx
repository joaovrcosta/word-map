"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  Brain,
  Network,
  TrendingUp,
  Settings,
  Target,
  Zap,
  Trophy,
} from "lucide-react";
import {
  getUserStats,
  getUserSettings,
  upsertUserSettings,
} from "@/actions/user-settings";
import { getCurrentUser } from "@/actions/auth";
import useUserSettingsStore from "@/store/userSettingsStore";
import useThemeStore from "@/store/themeStore";

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

const confidenceLabels: Record<number, string> = {
  1: "Iniciante",
  2: "Básico",
  3: "Intermediário",
  4: "Avançado",
};

const duoBarColors = [
  "bg-[#1cb0f6]",
  "bg-[#58cc02]",
  "bg-[#ffc800]",
  "bg-[#ce82ff]",
  "bg-[#ff9600]",
  "bg-[#ff4b4b]",
];

function DuoCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 dark:border-[#373e47] dark:bg-[#2d333b] ${className}`}
    >
      {children}
    </div>
  );
}

function ProgressBar({
  percent,
  color = "bg-[#1cb0f6]",
}: {
  percent: number;
  color?: string;
}) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-[#e5e5e5]">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
      />
    </div>
  );
}

export default function ProfilePage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [gamificationStats, setGamificationStats] =
    useState<GamificationStats | null>(null);
  const [displayName, setDisplayName] = useState("Você");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { settings, updateSettings } = useUserSettingsStore();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, userSettings, user] = await Promise.all([
          getUserStats(),
          getUserSettings(),
          getCurrentUser(),
        ]);

        setStats(statsData);
        if (user?.name) {
          setDisplayName(user.name.split(" ")[0]);
        }

        if (userSettings) {
          updateSettings({
            useAllVaultsForLinks: userSettings.useAllVaultsForLinks,
            autoTranslateWordPreview: userSettings.autoTranslateWordPreview,
          });
        } else {
          updateSettings({
            useAllVaultsForLinks: false,
            autoTranslateWordPreview: false,
          });
        }

        if (statsData) {
          setGamificationStats(calculateGamificationStats(statsData));
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        setStats({
          totalWords: 0,
          totalVaults: 0,
          wordsByConfidence: [],
          wordsByCategory: [],
          wordsByGrammaticalClass: [],
          recentActivity: 0,
          totalConnections: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [updateSettings]);

  const calculateGamificationStats = (
    userStats: UserStats
  ): GamificationStats => {
    const level = Math.floor(userStats.totalWords / 10) + 1;
    const experience = userStats.totalWords * 10;
    const experienceToNextLevel = level * 10 * 10 - experience;

    const streak = Math.min(userStats.recentActivity, 7);
    const bestStreak = Math.max(streak, 14);

    const achievements: string[] = [];
    if (userStats.totalWords >= 10) achievements.push("Iniciante");
    if (userStats.totalWords >= 25) achievements.push("Aprendiz");
    if (userStats.totalWords >= 50) achievements.push("Estudioso");
    if (userStats.totalWords >= 100) achievements.push("Mestre");
    if (userStats.totalVaults >= 3) achievements.push("Organizador");
    if (userStats.totalConnections >= 10) achievements.push("Conectador");
    if (userStats.recentActivity >= 5) achievements.push("Consistente");

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

  const handleUseAllVaultsChange = async (useAllVaults: boolean) => {
    setSaving(true);
    try {
      await upsertUserSettings({
        useAllVaultsForLinks: useAllVaults,
      });
      updateSettings({ useAllVaultsForLinks: useAllVaults });
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao salvar configuração: ${error.message}`);
      } else {
        alert("Erro desconhecido ao salvar configuração");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAutoTranslateChange = async (autoTranslate: boolean) => {
    setSaving(true);
    try {
      await upsertUserSettings({
        autoTranslateWordPreview: autoTranslate,
      });
      updateSettings({ autoTranslateWordPreview: autoTranslate });
    } catch (error) {
      if (error instanceof Error) {
        alert(`Erro ao salvar configuração: ${error.message}`);
      } else {
        alert("Erro desconhecido ao salvar configuração");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#1cb0f6]" />
          <p className="mt-4 text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="font-bold text-[#777]">Erro ao carregar estatísticas</p>
      </div>
    );
  }

  const xpTotal =
    (gamificationStats?.experience ?? 0) +
    (gamificationStats?.experienceToNextLevel ?? 0);
  const xpPercent = xpTotal
    ? ((gamificationStats?.experience ?? 0) / xpTotal) * 100
    : 0;
  const maxConfidence = Math.max(
    1,
    ...stats.wordsByConfidence.map((w) => w.count)
  );

  const summaryCards = [
    {
      label: "Palavras",
      value: stats.totalWords,
      hint: "Aprendidas",
      icon: BookOpen,
      color: "text-[#1cb0f6]",
      bg: "bg-[#ddf4ff]",
    },
    {
      label: "Vaults",
      value: stats.totalVaults,
      hint: "Coleções",
      icon: Brain,
      color: "text-[#58cc02]",
      bg: "bg-[#d7ffb8]",
    },
    {
      label: "Conexões",
      value: stats.totalConnections,
      hint: "Palavras ligadas",
      icon: Network,
      color: "text-[#ce82ff]",
      bg: "bg-[#f2dfff]",
    },
    {
      label: "Atividade",
      value: stats.recentActivity,
      hint: "Últimos 30 dias",
      icon: TrendingUp,
      color: "text-[#ff9600]",
      bg: "bg-[#fff5d6]",
    },
  ];

  return (
    <div className="min-h-full max-w-full overflow-x-hidden bg-white dark:bg-gray-950">
      <div className="px-8 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-[26px] leading-none" aria-hidden="true">
            🦉
          </span>
          <div>
            <h1 className="text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
              Olá, {displayName}
            </h1>
            <p className="mt-1 text-sm font-bold text-[#afafaf]">
              Acompanhe seu progresso e configure suas preferências
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-6 pb-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <DuoCard key={card.label} className="text-center">
              <div
                className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${card.bg}`}
              >
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <p className={`text-3xl font-extrabold ${card.color}`}>
                {card.value}
              </p>
              <p className="mt-2 text-xs font-extrabold uppercase tracking-wide text-[#afafaf]">
                {card.label}
              </p>
              <p className="mt-1 text-xs font-bold text-[#777]">{card.hint}</p>
            </DuoCard>
          ))}
        </div>

        {gamificationStats && (
          <DuoCard>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff5d6]">
                  <Trophy className="h-6 w-6 text-[#ffc800]" />
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[#ffc800]">
                    Nível
                  </p>
                  <h2 className="text-lg font-extrabold text-[#3c3c3c] dark:text-white">
                    Nível {gamificationStats.level}
                  </h2>
                </div>
              </div>
              <p className="text-sm font-extrabold text-[#afafaf]">
                {gamificationStats.experience} / {xpTotal} XP
              </p>
            </div>
            <div className="mt-4">
              <ProgressBar percent={xpPercent} color="bg-[#ffc800]" />
              <p className="mt-2 text-center text-xs font-bold text-[#afafaf]">
                {gamificationStats.experienceToNextLevel} XP para o próximo
                nível
              </p>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#fff5d6] px-4 py-3 text-center">
                <p className="text-2xl font-extrabold text-[#ff9600]">
                  {gamificationStats.streak}
                </p>
                <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
                  Sequência
                </p>
              </div>
              <div className="rounded-2xl bg-[#ddf4ff] px-4 py-3 text-center">
                <p className="text-2xl font-extrabold text-[#1cb0f6]">
                  {gamificationStats.bestStreak}
                </p>
                <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
                  Recorde
                </p>
              </div>
            </div>
            {gamificationStats.achievements.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {gamificationStats.achievements.map((achievement) => (
                  <span
                    key={achievement}
                    className="rounded-full bg-[#d7ffb8] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#58cc02]"
                  >
                    {achievement}
                  </span>
                ))}
              </div>
            )}
          </DuoCard>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <DuoCard>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-[#1cb0f6]" />
                <h2 className="text-lg font-extrabold text-[#3c3c3c] dark:text-white">
                  Nível de confiança
                </h2>
              </div>
              <p className="mt-1 text-sm font-bold text-[#afafaf]">
                Distribuição das palavras por nível de aprendizado
              </p>
              <div className="mt-5 space-y-4">
                {stats.wordsByConfidence.length === 0 ? (
                  <p className="text-sm font-bold text-[#777]">
                    Adicione palavras para ver esta análise.
                  </p>
                ) : (
                  stats.wordsByConfidence.map((item) => {
                    const percentage = stats.totalWords
                      ? (item.count / stats.totalWords) * 100
                      : 0;
                    const barPercent = (item.count / maxConfidence) * 100;
                    return (
                      <div key={item.confidence}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-extrabold text-[#3c3c3c]">
                            {confidenceLabels[item.confidence] ??
                              `Nível ${item.confidence}`}
                          </span>
                          <span className="text-xs font-extrabold uppercase tracking-wide text-[#afafaf]">
                            {item.count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <ProgressBar percent={barPercent} />
                      </div>
                    );
                  })
                )}
              </div>
            </DuoCard>

            <DuoCard>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#ce82ff]" />
                <h2 className="text-lg font-extrabold text-[#3c3c3c] dark:text-white">
                  Classe gramatical
                </h2>
              </div>
              <p className="mt-1 text-sm font-bold text-[#afafaf]">
                Distribuição por tipo de palavra
              </p>
              <div className="mt-5 space-y-4">
                {stats.wordsByGrammaticalClass.length === 0 ? (
                  <p className="text-sm font-bold text-[#777]">
                    Ainda não há classes gramaticais para mostrar.
                  </p>
                ) : (
                  stats.wordsByGrammaticalClass.map((item, index) => {
                    const percentage = stats.totalWords
                      ? (item.count / stats.totalWords) * 100
                      : 0;
                    return (
                      <div key={item.grammaticalClass}>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-extrabold text-[#3c3c3c]">
                            {item.grammaticalClass}
                          </span>
                          <span className="text-xs font-extrabold uppercase tracking-wide text-[#afafaf]">
                            {item.count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <ProgressBar
                          percent={percentage}
                          color={duoBarColors[index % duoBarColors.length]}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </DuoCard>

            {stats.wordsByCategory.length > 0 && (
              <DuoCard>
                <h2 className="text-lg font-extrabold text-[#3c3c3c] dark:text-white">
                  Categorias
                </h2>
                <p className="mt-1 text-sm font-bold text-[#afafaf]">
                  Palavras organizadas por categoria
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {stats.wordsByCategory.map((item) => (
                    <span
                      key={item.category}
                      className="rounded-full bg-[#ddf4ff] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[#1cb0f6]"
                    >
                      {item.category} ({item.count})
                    </span>
                  ))}
                </div>
              </DuoCard>
            )}
          </div>

          <div className="space-y-4">
            <DuoCard>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#1cb0f6]" />
                <h2 className="text-lg font-extrabold text-[#3c3c3c] dark:text-white">
                  Configurações
                </h2>
              </div>
              <p className="mt-1 text-sm font-bold text-[#afafaf]">
                Personalize como o sistema funciona para você
              </p>

              <div className="mt-5 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label
                      htmlFor="use-all-vaults"
                      className="text-sm font-extrabold text-[#3c3c3c]"
                    >
                      Usar todas as palavras para links
                    </Label>
                    <p className="mt-1 text-sm font-bold text-[#777]">
                      {settings.useAllVaultsForLinks
                        ? "Permite conectar palavras de todos os vaults"
                        : "Permite conectar apenas palavras do vault ativo"}
                    </p>
                  </div>
                  <Switch
                    id="use-all-vaults"
                    checked={settings.useAllVaultsForLinks}
                    onCheckedChange={handleUseAllVaultsChange}
                    disabled={saving}
                    className="data-[state=checked]:bg-[#58cc02]"
                  />
                </div>

                <div className="border-t-2 border-[#e5e5e5] dark:border-gray-800" />

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label
                      htmlFor="dark-theme"
                      className="text-sm font-extrabold text-[#3c3c3c] dark:text-white"
                    >
                      Tema escuro
                    </Label>
                    <p className="mt-1 text-sm font-bold text-[#777]">
                      {theme === "dark"
                        ? "Interface escura para leitura à noite"
                        : "Interface clara"}
                    </p>
                  </div>
                  <Switch
                    id="dark-theme"
                    checked={theme === "dark"}
                    onCheckedChange={(checked) =>
                      setTheme(checked ? "dark" : "light")
                    }
                    className="data-[state=checked]:bg-[#58cc02]"
                  />
                </div>

                <div className="border-t-2 border-[#e5e5e5] dark:border-gray-800" />

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Label
                      htmlFor="auto-translate-preview"
                      className="text-sm font-extrabold text-[#3c3c3c]"
                    >
                      Traduzir preview de palavras
                    </Label>
                    <p className="mt-1 text-sm font-bold text-[#777]">
                      {settings.autoTranslateWordPreview
                        ? "Definições e exemplos aparecem em português ao clicar em palavras nos textos"
                        : "Definições e exemplos aparecem em inglês ao clicar em palavras nos textos"}
                    </p>
                  </div>
                  <Switch
                    id="auto-translate-preview"
                    checked={settings.autoTranslateWordPreview}
                    onCheckedChange={handleAutoTranslateChange}
                    disabled={saving}
                    className="data-[state=checked]:bg-[#58cc02]"
                  />
                </div>

                <div className="rounded-2xl bg-[#f7f7f7] p-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
                    Como funciona
                  </p>
                  <ul className="mt-2 space-y-2 text-sm font-bold text-[#777]">
                    <li>
                      Desligado: só palavras do vault atual entram nas
                      sugestões de link.
                    </li>
                    <li>
                      Ligado: todas as palavras de todos os vaults são
                      consideradas.
                    </li>
                  </ul>
                </div>
              </div>
            </DuoCard>

            <DuoCard>
              <h2 className="text-lg font-extrabold text-[#3c3c3c] dark:text-white">
                Sistema
              </h2>
              <div className="mt-4 space-y-3 text-sm font-bold text-[#777]">
                <div className="flex justify-between">
                  <span>Versão</span>
                  <span className="font-extrabold text-[#3c3c3c]">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span>Atualizado</span>
                  <span className="font-extrabold text-[#3c3c3c]">
                    {new Date().toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </DuoCard>
          </div>
        </div>
      </div>
    </div>
  );
}
