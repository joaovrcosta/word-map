"use client";

import { Check, FileText } from "lucide-react";

type TextsOnboardingProps = {
  firstName: string;
  onCreateText: () => void;
};

export function TextsOnboarding({
  firstName,
  onCreateText,
}: TextsOnboardingProps) {
  const greeting = firstName ? `Olá, ${firstName}` : "Olá";

  return (
    <div className="flex flex-col items-center pt-6 pb-16">
      <div className="flex size-[120px] items-center justify-center">
        <FileText className="size-16 text-[#14804a] dark:text-[#7ddea8]" strokeWidth={1.75} />
      </div>
      <h2 className="mt-4 text-[22px] font-extrabold text-[#3c3c3c] dark:text-white">
        {greeting}{" "}
        <span aria-hidden="true" className="text-[20px]">
          ⭐
        </span>
        <span> !</span>
      </h2>

      <ol className="mt-10 w-full max-w-[360px]">
        <li className="relative flex gap-4 pb-8">
          <span className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-[#e5e5e5]" />
          <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#24c875] text-white">
            <Check className="size-4" strokeWidth={3} />
          </span>
          <div className="pt-1">
            <p className="text-[15px] font-bold text-[#3c3c3c] dark:text-gray-100">
              Abra seus textos
            </p>
          </div>
        </li>

        <li className="relative flex gap-4 pb-8">
          <span className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-[#e5e5e5]" />
          <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e7f8ee] text-[13px] font-extrabold text-[#14804a] dark:text-[#7ddea8]">
            2
          </span>
          <div className="pt-0.5">
            <p className="text-[15px] font-bold text-[#3c3c3c] dark:text-gray-100">
              Crie um texto
            </p>
            <p className="mt-1 text-[14px] leading-snug text-[#777]">
              Salve artigos, diálogos ou trechos para identificar palavras dos
              seus vaults.
            </p>
            <button
              type="button"
              onClick={onCreateText}
              className="mt-3 inline-flex h-12 min-w-[210px] items-center justify-center rounded-2xl bg-[#24c875] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105"
            >
              Criar texto
            </button>
          </div>
        </li>

        <li className="relative flex gap-4">
          <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e7f8ee] text-[13px] font-extrabold text-[#14804a] dark:text-[#7ddea8]">
            3
          </span>
          <div className="pt-0.5">
            <p className="text-[15px] font-bold text-[#3c3c3c] dark:text-gray-100">
              Analise as palavras
            </p>
            <p className="mt-1 text-[14px] leading-snug text-[#777]">
              Abra um texto e veja quais palavras você já conhece nos seus
              vaults.
            </p>
          </div>
        </li>
      </ol>
    </div>
  );
}
