"use client";

import { Check } from "lucide-react";

type VaultOnboardingProps = {
  firstName: string;
  onAddWords: () => void;
  onCreateFlashcards: () => void;
};

export function VaultOnboarding({
  firstName,
  onAddWords,
  onCreateFlashcards,
}: VaultOnboardingProps) {
  const greeting = firstName ? `Olá, ${firstName}` : "Olá";

  return (
    <div className="flex flex-col items-center pt-6 pb-16">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/watermarked_img_10965904142986188787-removebg-preview.png"
        alt=""
        width={140}
        height={140}
        className="mx-auto h-[140px] w-[140px] object-contain"
      />
      <h2 className="mt-4 text-[22px] font-extrabold text-[#3c3c3c] dark:text-white">
        {greeting}{" "}
        <span aria-hidden="true" className="text-[20px]">
          ⭐
        </span>
        <span className="text-[#3c3c3c] dark:text-white"> !</span>
      </h2>

      <ol className="mt-10 w-full max-w-[360px]">
        <li className="relative flex gap-4 pb-8">
          <span className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-[#e5e5e5]" />
          <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#58cc02] text-white">
            <Check className="size-4" strokeWidth={3} />
          </span>
          <div className="pt-1">
            <p className="text-[15px] font-bold text-[#3c3c3c] dark:text-gray-100">
              Crie um vault
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
              Adicione palavras
            </p>
            <p className="mt-1 text-[14px] leading-snug text-[#777]">
              Inclua vocabulário para começar sua jornada de aprendizado neste
              vault.
            </p>
            <button
              type="button"
              onClick={onAddWords}
              className="mt-3 inline-flex h-12 min-w-[210px] items-center justify-center rounded-2xl bg-[#1cb0f6] px-5 text-sm font-extrabold uppercase tracking-wide text-white border-b-4 border-[#1899d6] hover:brightness-105 active:translate-y-0.5 active:border-b-2"
            >
              Adicionar palavras
            </button>
          </div>
        </li>

        <li className="relative flex gap-4">
          <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#ddf4ff] text-[13px] font-extrabold text-[#1cb0f6]">
            3
          </span>
          <div className="pt-0.5">
            <p className="text-[15px] font-bold text-[#3c3c3c] dark:text-gray-100">
              Estude com flashcards
            </p>
            <p className="mt-1 text-[14px] leading-snug text-[#777]">
              Explore conteúdos que ensinam habilidades específicas e ajudam a
              criar hábitos diários!
            </p>
            <button
              type="button"
              onClick={onCreateFlashcards}
              className="mt-3 inline-flex h-12 min-w-[210px] items-center justify-center rounded-2xl bg-white px-5 text-sm font-extrabold uppercase tracking-wide text-[#1cb0f6] border-2 border-[#e5e5e5] hover:bg-[#f7f7f7] active:translate-y-0.5"
            >
              Criar flashcards
            </button>
          </div>
        </li>
      </ol>
    </div>
  );
}
