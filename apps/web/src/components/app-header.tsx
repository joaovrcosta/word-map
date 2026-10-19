"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useVaults } from "@/hooks/use-words";
import { getRanking } from "@/actions/actions";
import { withPendingPoints } from "@/lib/points-optimistic";
import { readingBackHref } from "@/lib/reading-route";
import { CountUp } from "@/components/count-up";
import { BookOpen, ChevronLeft, Crown, ChevronDown, Trophy } from "lucide-react";
import LogoutButton from "@/components/logout-button";
import type { VaultNavItem } from "@/types/vault-nav";

function UkFlag() {
  return (
    <svg
      viewBox="0 0 16 11"
      className="h-[14px] w-[20px] shrink-0 overflow-hidden rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.12)]"
      aria-hidden="true"
    >
      <rect width="16" height="11" fill="#fff" />
      <rect y="0" width="16" height="1.22" fill="#B22234" />
      <rect y="2.44" width="16" height="1.22" fill="#B22234" />
      <rect y="4.88" width="16" height="1.22" fill="#B22234" />
      <rect y="7.32" width="16" height="1.22" fill="#B22234" />
      <rect y="9.76" width="16" height="1.22" fill="#B22234" />
      <rect width="7" height="6" fill="#3C3B6E" />
    </svg>
  );
}

function countSavedWords(vaults: VaultNavItem[]) {
  return vaults.reduce((total, vault) => total + vault.wordCount, 0);
}

export function AppHeader({
  initialVaults = [],
}: {
  initialVaults?: VaultNavItem[];
}) {
  const { data } = useVaults();
  const { data: ranking } = useQuery({
    queryKey: ["ranking", "lifetime"],
    queryFn: async () => withPendingPoints(await getRanking("lifetime")),
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const savedWords = mounted
    ? (data ?? []).reduce(
        (total, vault) => total + (vault.words?.length ?? 0),
        0
      )
    : countSavedWords(initialVaults);
  const backHref = readingBackHref(usePathname());

  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-[#e8eaed] bg-white px-4 dark:border-[#373e47] dark:bg-[#1c2128]">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Voltar"
          className="mr-auto inline-flex h-9 items-center gap-2 rounded-lg px-1 text-[#8b949e] hover:text-[#1a1a1a] dark:hover:text-white"
        >
          <ChevronLeft className="size-5" strokeWidth={2.5} />
          <span className="flex size-8 items-center justify-center rounded-md bg-[#e8eaed] text-[#3c3c3c] dark:bg-[#4a515a] dark:text-[#e6edf3]">
            <BookOpen className="size-4" />
          </span>
        </Link>
      ) : null}
      <Link
        href="/home/profile"
        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#24c875] px-3 text-[13px] font-bold text-white hover:bg-[#1eaf68]"
      >
        <Crown className="h-3.5 w-3.5" strokeWidth={2.5} />
        Seja Premium
      </Link>

      <Link
        href="/home/ranking"
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-bold text-[#14804a] hover:bg-[#e7f8ee] dark:text-[#7ddea8] dark:hover:bg-[#24c875]/15"
        title="Seus pontos"
      >
        <Trophy className="h-3.5 w-3.5" />
        {ranking ? <CountUp value={ranking.me.points} /> : <span>0</span>}
      </Link>

      <Link
        href="/home"
        className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-[13px] font-semibold text-[#555] hover:bg-black/[0.04] dark:text-zinc-200 dark:hover:bg-white/5"
        title="Palavras salvas"
      >
        <UkFlag />
        <span>{savedWords}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#999] dark:text-zinc-500" />
      </Link>
      <LogoutButton />
    </header>
  );
}
