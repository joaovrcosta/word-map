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

export default function ProfilePage() {
  const [stats, setStats] = useState<UserStats | null>(null);
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
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, updateSettings]);

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

          {/* Gráficos */}
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
