"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GRAMMAR_CLASSES,
  grammarClassBySlug,
} from "@/lib/grammar-guide";
import { cn } from "@/lib/utils";

export function GrammarGuide({ focusSlug }: { focusSlug?: string }) {
  const router = useRouter();
  const focus = grammarClassBySlug(focusSlug);

  useEffect(() => {
    if (!focus) return;
    document.getElementById(`classe-${focus.slug}`)?.scrollIntoView({
      block: "start",
    });
  }, [focus]);

  return (
    <div className="min-h-full bg-[#f6f7f9] px-6 pb-16 pt-5 dark:bg-[#22272e] sm:px-8">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-3 -ml-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <h1 className="text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
        Classes gramaticais
      </h1>
      <p className="mt-2 max-w-xl text-[15px] leading-snug text-[#777] dark:text-[#8b949e]">
        Cada tag na palavra diz o papel dela na frase. Escolha uma classe para
        ler o que ela faz.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {GRAMMAR_CLASSES.map((item) => {
          const selected = item.slug === focus?.slug;
          return (
            <Link
              key={item.slug}
              href={`/home/gramatica/${item.slug}`}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide",
                selected
                  ? "bg-[#24c875] text-white"
                  : "bg-[#f7f7f7] text-[#777] hover:bg-[#e7f8ee] hover:text-[#14804a] dark:bg-white/10 dark:text-[#8b949e] dark:hover:bg-[#24c875]/15 dark:hover:text-[#7ddea8]"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-4 max-w-2xl divide-y divide-[#e5e5e5] dark:divide-[#373e47]">
        {GRAMMAR_CLASSES.map((item) => {
          const selected = item.slug === focus?.slug;
          return (
            <article
              key={item.slug}
              id={`classe-${item.slug}`}
              className={cn(
                "scroll-mt-6 py-6",
                selected &&
                  "-mx-4 rounded-2xl bg-[#e7f8ee] px-4 dark:bg-[#24c875]/10"
              )}
            >
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#14804a] dark:text-[#7ddea8]">
                {item.label}
              </p>
              <h2 className="mt-1 text-[20px] font-extrabold text-[#3c3c3c] dark:text-white">
                {item.summary}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#4b4b4b] dark:text-[#c9d1d9]">
                {item.explanation}
              </p>
              <p className="mt-4 text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
                Exemplo
              </p>
              <p className="mt-1 text-[16px] font-extrabold text-[#3c3c3c] dark:text-white">
                {item.exampleEn}
              </p>
              <p className="text-[15px] font-bold text-[#14804a] dark:text-[#7ddea8]">
                {item.examplePt}
              </p>
              <p className="mt-1 text-[13px] leading-snug text-[#777] dark:text-[#8b949e]">
                {item.exampleNote}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
