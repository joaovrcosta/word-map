"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getVaults, type Vault } from "@/actions/actions";
import { FlashcardDeck } from "@/components/flashcards";

export default function FlashcardsPage() {
  const [vaults, setVaults] = useState<Vault[] | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    getVaults()
      .then(setVaults)
      .catch((error) => {
        console.error("Erro ao carregar vaults:", error);
        setVaults([]);
      });
  }, []);

  const wordCount = vaults?.reduce((sum, vault) => sum + vault.words.length, 0) ?? 0;

  if (started) {
    return (
      <div className="min-h-full bg-[#f6f7f9] px-8 py-6 dark:bg-[#22272e]">
        <FlashcardDeck autostart />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f6f7f9] dark:bg-[#22272e]">
      <div className="px-8 pt-5">
        <div className="flex items-center gap-3">
          <span className="text-[26px] leading-none" aria-hidden="true">
            💡
          </span>
          <h1 className="text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
            Treino
          </h1>
        </div>

        {vaults === null ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#24c875]" />
          </div>
        ) : wordCount === 0 ? (
          <div className="mx-auto max-w-md py-16 text-center">
            <p className="text-[15px] font-extrabold text-[#3c3c3c] dark:text-white">
              Nenhuma palavra ainda
            </p>
            <p className="mt-2 text-[14px] leading-snug text-[#777] dark:text-[#8b949e]">
              Salve palavras em um vault para treinar.
            </p>
            <Link
              href="/create-vault"
              className="mt-8 inline-flex h-12 min-w-[210px] items-center justify-center rounded-2xl bg-[#24c875] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105"
            >
              Criar vault
            </Link>
          </div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
            <p className="text-[14px] leading-snug text-[#777] dark:text-[#8b949e]">
              Pratique com todas as suas palavras, sem escolher um vault.
            </p>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="mt-8 inline-flex h-12 min-w-[210px] items-center justify-center rounded-2xl bg-[#24c875] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105"
            >
              Começar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
