"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
      const foundVault = vaults.find((item) => item.id === vaultId);

      if (foundVault) {
        setVault(foundVault);
        setError(null);
      } else {
        setError("Não foi possível abrir este vault.");
      }
    } catch (loadError) {
      setError("Não foi possível abrir este vault.");
      console.error("Erro ao carregar vault:", loadError);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#1cb0f6]" />
      </div>
    );
  }

  if (error || !vault) {
    return (
      <div className="min-h-full bg-white px-8 pt-10 dark:bg-[#22272e]">
        <p className="text-[15px] font-extrabold text-[#3c3c3c] dark:text-white">
          Vault não encontrado
        </p>
        <p className="mt-2 text-[14px] text-[#777] dark:text-[#8b949e]">
          {error || "Não foi possível abrir este vault."}
        </p>
        <Link
          href="/home/vault"
          className="mt-6 inline-flex text-[13px] font-extrabold uppercase tracking-wide text-[#1cb0f6]"
        >
          Voltar
        </Link>
      </div>
    );
  }

  const wordLabel =
    vault.words.length === 1 ? "1 palavra" : `${vault.words.length} palavras`;

  return (
    <div className="min-h-full bg-white dark:bg-[#22272e]">
      <div className="px-8 pt-5 pb-10">
        <Link
          href="/home/vault"
          className="text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf] hover:text-[#777]"
        >
          Voltar
        </Link>
        <h1 className="mt-3 text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
          {vault.name}
        </h1>
        <p className="mt-2 text-[14px] text-[#777] dark:text-[#8b949e]">
          {wordLabel}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => router.push(`/home?vaultId=${vaultId}`)}
            className="inline-flex h-12 min-w-[210px] items-center justify-center rounded-2xl border-b-4 border-[#1899d6] bg-[#1cb0f6] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105 active:translate-y-0.5 active:border-b-2"
          >
            Ver palavras
          </button>
          <Link
            href={`/home/vault/${vaultId}/flashcards`}
            className="inline-flex h-12 items-center justify-center rounded-2xl border-2 border-[#e5e5e5] bg-white px-5 text-sm font-extrabold uppercase tracking-wide text-[#3c3c3c] hover:bg-[#f7f7f7] active:translate-y-0.5 dark:border-[#373e47] dark:bg-transparent dark:text-white dark:hover:bg-white/5"
          >
            Estudar
          </Link>
        </div>
      </div>
    </div>
  );
}
