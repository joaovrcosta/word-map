"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BookOpen,
  Plus,
  Brain,
  Target,
  Zap,
  Eye,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1cb0f6] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando vault...</p>
        </div>
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="px-8 py-12 text-center">
        <BookOpen className="h-16 w-16 mx-auto text-[#1cb0f6] mb-4" />
        <h1 className="text-2xl font-extrabold text-[#3c3c3c]">
          Vault não encontrado
        </h1>
        <p className="mt-2 text-[#777]">{error}</p>
        <Button className="mt-6" asChild>
          <Link href="/home/vault">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar aos vaults
          </Link>
        </Button>
      </div>
    );
  }

  const stats = [
    {
      label: "Total de palavras",
      value: vault.words.length,
      color: "text-[#1cb0f6]",
      icon: BookOpen,
    },
    {
      label: "Bem conhecidas",
      value: vault.words.filter((word) => word.confidence >= 3).length,
      color: "text-[#58cc02]",
      icon: Target,
    },
    {
      label: "Para revisar",
      value: vault.words.filter((word) => word.confidence <= 2).length,
      color: "text-[#ffc800]",
      icon: Zap,
    },
    {
      label: "Novas",
      value: vault.words.filter((word) => word.confidence === 1).length,
      color: "text-[#1cb0f6]",
      icon: Brain,
    },
  ];

  return (
    <div className="min-h-full bg-white dark:bg-gray-950">
      <div className="px-8 pt-5 pb-10">
        <Button
          variant="ghost"
          onClick={() => router.push("/home/vault")}
          className="-ml-2 mb-5 gap-2 text-[#777] hover:text-[#3c3c3c]"
        >
          <ArrowLeft className="w-4 h-4" />
          Vaults
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#1cb0f6]">
              Vault
            </p>
            <h1 className="mt-1 text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
              {vault.name}
            </h1>
            <p className="mt-1 text-sm font-bold text-[#afafaf]">
              {vault.words.length} palavra
              {vault.words.length !== 1 ? "s" : ""} neste vault
            </p>
          </div>
          <Button onClick={() => router.push(`/home?vaultId=${vaultId}`)}>
            <Plus size={20} className="mr-2" />
            Nova palavra
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 text-center dark:border-[#373e47] dark:bg-[#2d333b]"
            >
              <stat.icon className={`mx-auto mb-2 h-6 w-6 ${stat.color}`} />
              <p className={`text-3xl font-extrabold ${stat.color}`}>
                {stat.value}
              </p>
              <p className="mt-2 text-xs font-extrabold uppercase tracking-wide text-[#afafaf]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border-2 border-[#e5e5e5] p-6">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[#1cb0f6]" />
              <h2 className="text-lg font-extrabold text-[#3c3c3c]">
                Flashcards
              </h2>
            </div>
            <p className="mt-2 text-sm text-[#777]">
              Estude com repetição espaçada e foque nas palavras mais difíceis.
            </p>
            <Button className="mt-5 w-full" asChild>
              <Link href={`/home/vault/${vaultId}/flashcards`}>
                <Brain className="h-5 w-5 mr-2" />
                Iniciar flashcards
              </Link>
            </Button>
          </div>

          <div className="rounded-2xl border-2 border-[#e5e5e5] p-6">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-[#58cc02]" />
              <h2 className="text-lg font-extrabold text-[#3c3c3c]">
                Palavras
              </h2>
            </div>
            <p className="mt-2 text-sm text-[#777]">
              Veja, edite e organize todas as palavras deste vault.
            </p>
            <Button
              variant="outline"
              className="mt-5 w-full"
              onClick={() => router.push(`/home?vaultId=${vaultId}`)}
            >
              <Eye className="h-5 w-5 mr-2" />
              Ver palavras
            </Button>
          </div>
        </div>

        {vault.words.length > 0 && (
          <div className="mt-6 rounded-2xl border-2 border-[#e5e5e5] p-6">
            <h2 className="text-lg font-extrabold text-[#3c3c3c]">
              Palavras do vault
            </h2>
            <p className="mt-1 text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf]">
              {vault.words.length} palavra
              {vault.words.length !== 1 ? "s" : ""}
            </p>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {vault.words.slice(0, 12).map((word) => (
                <div
                  key={word.id}
                  className="rounded-2xl border-2 border-[#e5e5e5] p-4 hover:border-[#1cb0f6]/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-[#3c3c3c] truncate">
                      {word.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-[#ddf4ff] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-[#1cb0f6]">
                      Nível {word.confidence}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#777] truncate">
                    {word.grammaticalClass} •{" "}
                    {word.translations.slice(0, 2).join(", ")}
                  </p>
                </div>
              ))}
              {vault.words.length > 12 && (
                <button
                  type="button"
                  onClick={() => router.push(`/home?vaultId=${vaultId}`)}
                  className="rounded-2xl border-2 border-dashed border-[#e5e5e5] p-4 text-center text-sm font-extrabold uppercase tracking-wide text-[#1cb0f6] hover:border-[#1cb0f6] hover:bg-[#ddf4ff]"
                >
                  +{vault.words.length - 12} mais
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
