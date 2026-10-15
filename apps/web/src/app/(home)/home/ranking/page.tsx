"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getRanking, type RankingPeriod } from "@/actions/actions";
import { CountUp } from "@/components/count-up";
import { withPendingPoints } from "@/lib/points-optimistic";
import { cn } from "@/lib/utils";

const periods: Array<{ id: RankingPeriod; label: string }> = [
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
  { id: "lifetime", label: "Total" },
];

const avatarTones = [
  "bg-[#ce82ff]",
  "bg-[#1cb0f6]",
  "bg-[#ff9600]",
  "bg-[#58cc02]",
  "bg-[#ff4b4b]",
  "bg-[#2b70c9]",
  "bg-[#ff86d0]",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "A";
}

function LeagueMarks() {
  return (
    <div className="flex items-end justify-center gap-3" aria-hidden="true">
      <svg viewBox="0 0 40 44" className="h-9 w-8">
        <polygon points="20,2 36,11 36,33 20,42 4,33 4,11" fill="#ff9ec8" />
      </svg>
      <svg viewBox="0 0 40 40" className="h-9 w-9">
        <polygon points="12,2 28,2 38,12 38,28 28,38 12,38 2,28 2,12" fill="#5c6570" />
      </svg>
      <svg viewBox="0 0 40 44" className="h-9 w-8">
        <polygon points="20,2 36,11 36,33 20,42 4,33 4,11" fill="#7ee0f2" />
      </svg>
      <svg viewBox="0 0 64 56" className="mb-0.5 h-12 w-14">
        <polygon points="32,4 58,18 32,32 6,18" fill="#e8edf2" />
        <polygon points="6,18 32,32 32,52 6,38" fill="#c5ced8" />
        <polygon points="58,18 32,32 32,52 58,38" fill="#d7dee6" />
      </svg>
    </div>
  );
}

function Medal({
  face,
  ribbon,
}: {
  face: string;
  ribbon: string;
}) {
  return (
    <svg viewBox="0 0 32 36" className="size-8 shrink-0" aria-hidden="true">
      <path d="M10 2h4l2 8 2-8h4l-5 14H15L10 2z" fill={ribbon} />
      <circle cx="16" cy="22" r="9" fill={face} />
      <circle cx="16" cy="22" r="6.2" fill="#fff" fillOpacity="0.28" />
    </svg>
  );
}

function RankMark({ rank }: { rank: number }) {
  if (rank === 1) return <Medal face="#ffc800" ribbon="#f0b429" />;
  if (rank === 2) return <Medal face="#d5dde6" ribbon="#aeb8c4" />;
  if (rank === 3) return <Medal face="#e7a15a" ribbon="#c98445" />;
  return (
    <span className="flex w-8 shrink-0 justify-center text-[15px] font-bold text-[#afafaf]">
      {rank}
    </span>
  );
}

export default function RankingPage() {
  const [period, setPeriod] = useState<RankingPeriod>("week");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ranking", period],
    queryFn: async () => withPendingPoints(await getRanking(period)),
    placeholderData: keepPreviousData,
  });

  const listed = data?.entries ?? [];
  const meInList = listed.some((entry) => entry.isMe);

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] justify-center bg-white px-4 pb-16 pt-10 dark:bg-[#22272e]">
      <div className="mx-auto w-full max-w-[440px]">
        <LeagueMarks />
        <h1 className="mt-5 text-center text-[28px] font-extrabold tracking-tight text-[#3c3c3c] dark:text-white">
          Ranking
        </h1>
        <p className="mt-1 text-center text-[15px] text-[#afafaf]">
          Cada palavra salva vale {data?.pointsPerWord ?? 10} XP.
        </p>

        <div className="mt-4 flex justify-center gap-6">
          {periods.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={cn(
                "text-[15px] font-extrabold",
                period === item.id
                  ? "text-[#ffc800]"
                  : "text-[#afafaf] hover:text-[#777]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="mt-10 text-center text-[15px] text-[#afafaf]">
            Carregando ranking...
          </p>
        ) : isError || !data ? (
          <p className="mt-10 text-center text-[15px] text-[#afafaf]">
            Não foi possível carregar o ranking.
          </p>
        ) : listed.length === 0 ? (
          <p className="mt-10 text-center text-[15px] text-[#afafaf]">
            Ninguém pontuou ainda neste período.
          </p>
        ) : (
          <ol className="mt-6 flex flex-col">
            {listed.map((entry) => (
              <li
                key={entry.userId}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5",
                    entry.isMe && "bg-[#f4e9ff] dark:bg-[#3a2d4d]"
                  )}
              >
                <RankMark rank={entry.rank} />
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold text-white",
                    avatarTones[entry.userId % avatarTones.length]
                  )}
                >
                  {initials(entry.name)}
                </span>
                <p className="min-w-0 flex-1 truncate text-[16px] font-bold text-[#3c3c3c] dark:text-white">
                  {entry.name}
                  {entry.isMe ? (
                    <span className="ml-1 text-[#ffc800]" aria-label="você">
                      ★
                    </span>
                  ) : null}
                </p>
                <p className="shrink-0 text-[16px] font-bold text-[#afafaf]">
                  <CountUp value={entry.points} /> XP
                </p>
              </li>
            ))}
            {!meInList ? (
              <li className="mt-2 flex items-center gap-3 rounded-2xl bg-[#f4e9ff] px-3 py-2.5 dark:bg-[#3a2d4d]">
                <RankMark rank={data.me.rank ?? listed.length + 1} />
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ce82ff] text-[15px] font-extrabold text-white">
                  ★
                </span>
                <p className="min-w-0 flex-1 truncate text-[16px] font-bold text-[#3c3c3c] dark:text-white">
                  Você
                </p>
                <p className="shrink-0 text-[16px] font-bold text-[#afafaf]">
                  <CountUp value={data.me.points} /> XP
                </p>
              </li>
            ) : null}
          </ol>
        )}
      </div>
    </div>
  );
}
