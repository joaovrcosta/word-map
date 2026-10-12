"use client";

import Link from "next/link";
import { FlashcardSession } from "@/actions/flashcards";
import { Skeleton } from "@/components/ui/skeleton";

interface SessionSummaryProps {
  session: FlashcardSession;
  challengeCorrect?: number;
  challengeTotal?: number;
  analysis?: string | null;
  analysisState?: "none" | "loading" | "ready" | "unavailable";
  onRestartSession: () => void;
}

export function SessionSummary({
  session,
  challengeCorrect = 0,
  challengeTotal = 0,
  analysis = null,
  analysisState = "none",
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
      {challengeTotal > 0 ? (
        <p className="mt-1 text-[15px] text-[#777] dark:text-[#8b949e]">
          {challengeCorrect} de {challengeTotal}{" "}
          {challengeTotal === 1 ? "desafio certo" : "desafios certos"}
        </p>
      ) : null}
      {analysisState === "loading" ? (
        <div
          className="mt-6 w-full max-w-md text-left"
          aria-busy="true"
          aria-live="polite"
        >
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf]">
            Carregando o feedback da sessão
          </p>
          <div className="mt-3 space-y-2">
            <Skeleton className="h-3 w-full bg-[#e5e5e5] dark:bg-[#373e47]" />
            <Skeleton className="h-3 w-11/12 bg-[#e5e5e5] dark:bg-[#373e47]" />
            <Skeleton className="h-3 w-2/3 bg-[#e5e5e5] dark:bg-[#373e47]" />
          </div>
        </div>
      ) : null}
      {analysisState === "ready" && analysis ? (
        <p className="mt-6 max-w-md text-left text-[15px] leading-relaxed text-[#3c3c3c] dark:text-white">
          {analysis}
        </p>
      ) : null}
      {analysisState === "unavailable" ? (
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#777] dark:text-[#8b949e]">
          O feedback não ficou pronto desta vez. Os números da sessão continuam
          acima.
        </p>
      ) : null}

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
