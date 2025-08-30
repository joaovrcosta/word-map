"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  ArrowLeft,
  BookOpen,
  Plus,
  Brain,
  Target,
  Zap,
  Eye,
  Edit,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { getVaults, type Vault } from "@/actions/actions";

export default function VaultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vaultId = Number(params.id);
  const [vault, setVault] = useState<Vault | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVault();
  }, [vaultId]);

  const loadVault = async () => {
    try {
      setLoading(true);
      const vaults = await getVaults();
      const foundVault = vaults.find((v) => v.id === vaultId);

      if (foundVault) {
        setVault(foundVault);
      } else {
        setError("Vault não encontrado");
      }
    } catch (error) {
      setError("Erro ao carregar vault");
      console.error("Erro ao carregar vault:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVault = async () => {
    if (
      !confirm(
        "Tem certeza que deseja excluir este vault? Esta ação não pode ser desfeita."
      )
    ) {
      return;
    }

    try {
      // Aqui você implementaria a lógica de deletar o vault
      router.push("/home/vault");
    } catch (error) {
      console.error("Erro ao deletar vault:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="container mx-auto p-6">
        <Card className="text-center p-8">
          <div className="text-red-500 mb-4">
            <BookOpen className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Erro ao carregar vault
          </h3>
          <p className="text-gray-500 mb-4">
            {error || "Vault não encontrado"}
          </p>
          <Link href="/home/vault">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos Vaults
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/home/vault">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos Vaults
            </Button>
          </Link>

          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {vault.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Vault de vocabulário com {vault.words.length} palavras
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeleteVault}>
            <Trash className="h-4 w-4 mr-2" />
            Deletar
          </Button>
        </div>
      </div>

      {/* Estatísticas do Vault */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-blue-600">
              {vault.words.length}
            </div>
            <div className="text-sm text-gray-600">Total de Palavras</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Target className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <div className="text-2xl font-bold text-green-600">
              {vault.words.filter((w) => w.confidence >= 3).length}
            </div>
            <div className="text-sm text-gray-600">Bem Conhecidas</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Zap className="h-8 w-8 mx-auto text-orange-600 mb-2" />
            <div className="text-2xl font-bold text-orange-600">
              {vault.words.filter((w) => w.confidence <= 2).length}
            </div>
            <div className="text-sm text-gray-600">Para Revisar</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <Brain className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <div className="text-2xl font-bold text-purple-600">
              {vault.words.filter((w) => w.confidence === 1).length}
            </div>
            <div className="text-sm text-gray-600">Novas</div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estudar com Flashcards */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-600" />
              Estudar com Flashcards
            </CardTitle>
            <CardDescription>
              Sistema de repetição espaçada para memorização eficiente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Target className="h-4 w-4 text-green-600" />
                <span>Repetição espaçada inteligente</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Zap className="h-4 w-4 text-blue-600" />
                <span>Progresso adaptativo</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="h-4 w-4 text-purple-600" />
                <span>Foco nas palavras difíceis</span>
              </div>
            </div>

            <Link href={`/home/vault/${vaultId}/flashcards`}>
              <Button className="w-full mt-4" size="lg">
                <Brain className="h-5 w-5 mr-2" />
                Iniciar Flashcards
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Visualizar Palavras */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-6 w-6 text-blue-600" />
              Visualizar Palavras
            </CardTitle>
            <CardDescription>
              Ver todas as palavras do vault e suas conexões
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="h-4 w-4 text-green-600" />
                <span>Lista completa de palavras</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Target className="h-4 w-4 text-blue-600" />
                <span>Editar e organizar</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Zap className="h-4 w-4 text-purple-600" />
                <span>Gerenciar conexões</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full mt-4"
              size="lg"
              onClick={() => router.push(`/home?vaultId=${vaultId}`)}
            >
              <Eye className="h-5 w-5 mr-2" />
              Ver Palavras
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Lista Rápida de Palavras */}
      {vault.words.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gray-600" />
              Palavras do Vault ({vault.words.length})
            </CardTitle>
            <CardDescription>
              Visão geral das palavras armazenadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {vault.words.slice(0, 12).map((word) => (
                <div
                  key={word.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {word.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        word.confidence === 1
                          ? "bg-red-100 text-red-800 border-red-200"
                          : word.confidence === 2
                          ? "bg-orange-100 text-orange-800 border-orange-200"
                          : word.confidence === 3
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-blue-100 text-blue-800 border-blue-200"
                      }`}
                    >
                      Nível {word.confidence}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {word.grammaticalClass} •{" "}
                    {word.translations.slice(0, 2).join(", ")}
                  </div>
                </div>
              ))}

              {vault.words.length > 12 && (
                <div className="p-3 border rounded-lg bg-gray-50 text-center text-gray-500">
                  +{vault.words.length - 12} mais palavras...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adicionar Nova Palavra */}
      <Card>
        <CardContent className="p-6 text-center">
          <Plus className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Adicionar Nova Palavra
          </h3>
          <p className="text-gray-500 mb-4">
            Expanda seu vocabulário adicionando novas palavras ao vault
          </p>
          <Button
            variant="outline"
            onClick={() => router.push(`/home?vaultId=${vaultId}`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Palavra
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
