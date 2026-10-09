"use client";

import { BookOpen, Check, Store } from "lucide-react";

type BooksOnboardingProps = {
  firstName: string;
  onCreateBook: () => void;
  onOpenStore: () => void;
};

export function BooksOnboarding({
  firstName,
  onCreateBook,
  onOpenStore,
}: BooksOnboardingProps) {
  const greeting = firstName ? `Olá, ${firstName}` : "Olá";

  return (
    <div className="flex flex-col items-center pt-6 pb-16">
      <div className="flex size-[120px] items-center justify-center">
        <BookOpen className="size-16 text-[#1cb0f6]" strokeWidth={1.75} />
      </div>
      <h2 className="mt-4 text-[22px] font-extrabold text-[#3c3c3c] dark:text-white">
        {greeting}{" "}
        <span aria-hidden="true" className="text-[20px]">
          📚
        </span>
        <span> !</span>
      </h2>

      <ol className="mt-10 w-full max-w-[360px]">
        <li className="relative flex gap-4 pb-8">
          <span className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-[#e5e5e5]" />
          <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#58cc02] text-white">
            <Check className="size-4" strokeWidth={3} />
          </span>
          <div className="pt-1">
            <p className="text-[15px] font-bold text-[#3c3c3c] dark:text-gray-100">
              Abra seus livros
            </p>
          </div>
        </li>

        <li className="relative flex gap-4 pb-8">
          <span className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-[#e5e5e5]" />
          <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#ddf4ff] text-[13px] font-extrabold text-[#1cb0f6]">
            2
          </span>
          <div className="pt-0.5">
            <p className="text-[15px] font-bold text-[#3c3c3c] dark:text-gray-100">
              Crie um livro
            </p>
            <p className="mt-1 text-[14px] leading-snug text-[#777]">
              Organize capítulos com o mesmo conteúdo analisável dos textos.
            </p>
            <button
              type="button"
              onClick={onCreateBook}
              className="mt-3 inline-flex h-12 min-w-[210px] items-center justify-center rounded-2xl bg-[#1cb0f6] px-5 text-sm font-extrabold uppercase tracking-wide text-white border-b-4 border-[#1899d6] hover:brightness-105 active:translate-y-0.5 active:border-b-2"
            >
              Criar livro
            </button>
          </div>
        </li>

        <li className="relative flex gap-4">
          <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#ddf4ff] text-[13px] font-extrabold text-[#1cb0f6]">
            3
          </span>
          <div className="pt-0.5">
            <p className="text-[15px] font-bold text-[#3c3c3c] dark:text-gray-100">
              Adicione da loja
            </p>
            <p className="mt-1 text-[14px] leading-snug text-[#777]">
              Livros oficiais entram de graça na sua biblioteca, sem copiar o
              conteúdo.
            </p>
            <button
              type="button"
              onClick={onOpenStore}
              className="mt-3 inline-flex h-12 min-w-[210px] items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold uppercase tracking-wide text-[#1cb0f6] border-2 border-[#1cb0f6] hover:bg-[#ddf4ff]"
            >
              <Store className="size-4" />
              Ver loja
            </button>
          </div>
        </li>
      </ol>
    </div>
  );
}
