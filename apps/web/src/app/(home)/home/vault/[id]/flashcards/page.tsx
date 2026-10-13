"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FlashcardDeck } from "@/components/flashcards";
import { getVaultForFlashcards } from "@/actions/flashcards";

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

  if (error || !vaultInfo) {
    return (
      <div className="min-h-full bg-white px-8 pt-10 dark:bg-[#22272e]">
        <p className="text-[15px] font-extrabold text-[#3c3c3c] dark:text-white">
          Vault não encontrado
        </p>
        <p className="mt-2 text-[14px] text-[#777] dark:text-[#8b949e]">
          {error || "Não foi possível abrir este vault."}
        </p>
        <Link
          href="/home/flashcards"
          className="mt-6 inline-flex text-[13px] font-extrabold uppercase tracking-wide text-[#1cb0f6]"
        >
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white dark:bg-[#22272e]">
      <div className="px-8 pt-5 pb-10">
        <Link
          href={`/home/vault/${vaultId}`}
          className="text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf] hover:text-[#777]"
        >
          Voltar
        </Link>
        <h1 className="mt-3 text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
          {vaultInfo.name}
        </h1>
        <div className="mt-6">
          <FlashcardDeck vaultId={vaultInfo.id} vaultName={vaultInfo.name} />
        </div>
      </div>
    </div>
  );
}
