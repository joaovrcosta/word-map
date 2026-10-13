"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useVaults } from "@/hooks/use-words";
import { Crown, ChevronDown } from "lucide-react";
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

  return (
    <header className="flex h-12 shrink-0 items-center justify-end gap-3 border-b border-[#e5e5e5] bg-white px-4 dark:border-[#373e47] dark:bg-[#1c2128]">
      <Link
        href="/home/profile"
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#f5a623] px-3 text-[12px] font-extrabold uppercase tracking-wide text-[#1a1208] hover:bg-[#ffb83a]"
      >
        <Crown className="h-3.5 w-3.5" strokeWidth={2.5} />
        Seja Premium
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
    </header>
  );
}
