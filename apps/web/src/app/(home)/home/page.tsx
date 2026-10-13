"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWords } from "@/hooks/use-words";

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { vaults, isLoading } = useWords();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted || isLoading || !vaults || vaults.length === 0) return;
    const requested = Number(searchParams.get("vaultId"));
    const target = vaults.some((vault) => vault.id === requested)
      ? requested
      : vaults[0].id;
    router.replace(`/home/vault/${target}`);
  }, [hasMounted, isLoading, vaults, searchParams, router]);

  if (!hasMounted || isLoading || (vaults && vaults.length > 0)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#1cb0f6]" />
          <p className="mt-4 text-[#777]">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white px-6 pt-6 dark:bg-[#22272e]">
      <div className="mx-auto max-w-3xl rounded-2xl border-2 border-[#e5e5e5] bg-white p-10 text-center dark:border-[#373e47] dark:bg-[#22272e]">
        <BookOpen className="mx-auto mb-6 h-16 w-16 text-[#afafaf]" />
        <h1 className="text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
          Crie seu primeiro vault
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-snug text-[#777] dark:text-[#8b949e]">
          Cada vault tem as próprias palavras, o próprio relatório e as
          próprias configurações.
        </p>
        <Button size="lg" className="mt-8 px-8 py-3" asChild>
          <Link href="/create-vault">
            <Plus size={20} className="mr-2" />
            Criar meu próprio vault
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#1cb0f6]" />
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
