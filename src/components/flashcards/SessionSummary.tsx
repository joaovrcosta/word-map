"use client";

import Link from "next/link";
import { FlashcardSession } from "@/actions/flashcards";

interface SessionSummaryProps {
  session: FlashcardSession;
  onRestartSession: () => void;
}

export function SessionSummary({
  session,
  onRestartSession,
}: SessionSummaryProps) {
  const duration = session.endTime
    ? Math.round(
        (session.endTime.getTime() - session.startTime.getTime()) / 1000 / 60
      )
    : 0;

  const durationLabel =
    duration < 1 ? "Menos de um minuto" : `${duration} min`;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-2 py-16 text-center">
      <h2 className="text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
        Sessão concluída
      </h2>
      <p className="mt-3 text-[15px] text-[#777] dark:text-[#8b949e]">
        {session.completedWords}{" "}
        {session.completedWords === 1 ? "palavra estudada" : "palavras estudadas"}
      </p>
      <p className="mt-1 text-[15px] text-[#777] dark:text-[#8b949e]">
        {durationLabel}
      </p>

      <button
        type="button"
        onClick={onRestartSession}
        className="mt-8 inline-flex h-12 min-w-[210px] items-center justify-center rounded-2xl border-b-4 border-[#1899d6] bg-[#1cb0f6] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105 active:translate-y-0.5 active:border-b-2"
      >
        Estudar de novo
      </button>

      <Link
        href="/home/flashcards"
        className="mt-4 text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf] hover:text-[#777]"
      >
        Voltar
      </Link>
    </div>
  );
}
