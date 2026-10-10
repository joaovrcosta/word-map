"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getVaults, type Vault } from "@/actions/actions";

export default function FlashcardsPage() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [loading, setLoading] = useState(true);
  const [vaultStats, setVaultStats] = useState<
    Record<number, { totalWords: number; wordsToReview: number }>
  >({});

  useEffect(() => {
    loadVaults();
  }, []);

  const loadVaults = async () => {
    try {
      setLoading(true);
      const vaultsData = await getVaults();
      setVaults(vaultsData);

      const stats: Record<
        number,
        { totalWords: number; wordsToReview: number }
      > = {};

      for (const vault of vaultsData) {
        stats[vault.id] = {
          totalWords: vault.words.length,
          wordsToReview: vault.words.filter((word) => word.confidence <= 2)
            .length,
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
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#1cb0f6]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white dark:bg-[#22272e]">
      <div className="px-8 pt-5">
        <div className="flex items-center gap-3">
          <span className="text-[26px] leading-none" aria-hidden="true">
            💡
          </span>
          <h1 className="text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
            Flashcards
          </h1>
        </div>

        {vaults.length === 0 ? (
          <div className="mx-auto max-w-md py-16 text-center">
            <p className="text-[15px] font-extrabold text-[#3c3c3c] dark:text-white">
              Nenhum vault ainda
            </p>
            <p className="mt-2 text-[14px] leading-snug text-[#777] dark:text-[#8b949e]">
              Crie um vault e adicione palavras para estudar.
            </p>
            <Link
              href="/create-vault"
              className="mt-8 inline-flex h-12 min-w-[210px] items-center justify-center rounded-2xl border-b-4 border-[#1899d6] bg-[#1cb0f6] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105 active:translate-y-0.5 active:border-b-2"
            >
              Criar vault
            </Link>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-[#e5e5e5] dark:divide-[#373e47]">
            {vaults.map((vault) => {
              const stats = vaultStats[vault.id] || {
                totalWords: 0,
                wordsToReview: 0,
              };
              const reviewLabel =
                stats.wordsToReview === 1
                  ? "1 para revisar"
                  : `${stats.wordsToReview} para revisar`;

              return (
                <li
                  key={vault.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-extrabold text-[#3c3c3c] dark:text-white">
                      {vault.name}
                    </p>
                    <p className="mt-0.5 text-[14px] text-[#777] dark:text-[#8b949e]">
                      {reviewLabel}
                    </p>
                  </div>
                  {stats.totalWords === 0 ? (
                    <span className="shrink-0 text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf]">
                      Vazio
                    </span>
                  ) : (
                    <Link
                      href={`/home/vault/${vault.id}/flashcards`}
                      className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl border-b-4 border-[#1899d6] bg-[#1cb0f6] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105 active:translate-y-0.5 active:border-b-2"
                    >
                      Estudar
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
