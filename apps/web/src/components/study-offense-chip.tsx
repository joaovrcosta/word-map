"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { browserApi } from "@/lib/api/resources";
import type { StudyToday } from "@/lib/study";

export function StudyOffenseChip() {
  const { data } = useQuery({
    queryKey: ["study", "today"],
    queryFn: () => browserApi.getStudyToday() as Promise<StudyToday>,
    refetchInterval: 60_000,
  });

  if (!data) return null;

  const minutes = Math.floor(data.seconds / 60);
  const label = data.completed
    ? `${data.currentStreak}d`
    : `${minutes}/${data.goalMinutes} min`;

  return (
    <Link
      href="/home/profile"
      title={
        data.atRisk
          ? "Ofensiva em risco — complete a meta hoje"
          : data.completed
            ? "Meta de hoje concluída"
            : "Progresso da meta diária"
      }
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-bold hover:bg-black/[0.04] dark:hover:bg-white/5 ${
        data.atRisk
          ? "text-[#e8590c]"
          : data.completed
            ? "text-[#14804a] dark:text-[#7ddea8]"
            : "text-[#555] dark:text-zinc-200"
      }`}
    >
      <Flame className="h-3.5 w-3.5" strokeWidth={2.5} />
      <span>{label}</span>
      {!data.completed && data.currentStreak > 0 ? (
        <span className="text-[11px] font-semibold opacity-70">{data.currentStreak}d</span>
      ) : null}
    </Link>
  );
}
