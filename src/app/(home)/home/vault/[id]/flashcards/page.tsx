"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FlashcardDeck } from "@/components/flashcards";
import { getVaultForFlashcards } from "@/actions/flashcards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Brain, Target, Clock } from "lucide-react";
import Link from "next/link";

interface VaultInfo {
  id: number;
  name: string;
  totalWords: number;
}

export default function VaultFlashcardsPage() {
  const params = useParams();
  const vaultId = Number(params.id);
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVaultInfo();
  }, [vaultId]);

  const loadVaultInfo = async () => {
    try {
      setLoading(true);
      const info = await getVaultForFlashcards(vaultId);
      setVaultInfo(info);
    } catch (error) {
      setError("Erro ao carregar informações do vault");
      console.error("Erro ao carregar vault:", error);
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

  if (error || !vaultInfo) {
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
            {error || "Vault não encontrado ou erro inesperado"}
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
      <div className="flex items-center gap-4">
        <Link href={`/home/vault/${vaultId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Vault
          </Button>
        </Link>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Flashcards - {vaultInfo.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sistema de repetição espaçada para memorização eficiente
          </p>
        </div>
      </div>

      {/* Informações do Vault */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Informações do Vault
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {vaultInfo.totalWords}
              </div>
              <div className="text-sm text-blue-600">Total de Palavras</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {vaultInfo.totalWords > 0 ? "Pronto" : "Vazio"}
              </div>
              <div className="text-sm text-green-600">Status</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {vaultInfo.totalWords > 0 ? "Ativo" : "Inativo"}
              </div>
              <div className="text-sm text-purple-600">Flashcards</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sistema de Flashcards */}
      <FlashcardDeck vaultId={vaultInfo.id} vaultName={vaultInfo.name} />

      {/* Dicas de Uso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Dicas para Melhor Aproveitamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                Como Estudar
              </h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Estude em sessões de 15-30 minutos</li>
                <li>• Revise palavras difíceis mais frequentemente</li>
                <li>• Use o sistema de confiança honestamente</li>
                <li>• Mantenha consistência diária</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                Sistema de Repetição
              </h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Nível 1-2: Revisão diária</li>
                <li>• Nível 3: Revisão a cada 3 dias</li>
                <li>• Nível 4: Revisão semanal</li>
                <li>• Progresso adaptativo automático</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
