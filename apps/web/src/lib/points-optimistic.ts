import type { QueryClient } from "@tanstack/react-query";

type RankingBoard = {
  pointsPerWord: number;
  me: { points: number; rank: number | null };
  entries: Array<{
    rank: number;
    userId: number;
    name: string;
    points: number;
    isMe: boolean;
  }>;
};

export const POINTS_PER_SAVED_WORD = 10;

export const POINTS_DELTA_EVENT = "word-map:points";
export const POINTS_SYNC_EVENT = "word-map:points-sync";

let pendingDelta = 0;

export function bumpRankingBoard(
  board: RankingBoard,
  delta: number
): RankingBoard {
  const points = Math.max(0, board.me.points + delta);
  const entries = board.entries
    .map((entry) => (entry.isMe ? { ...entry, points } : { ...entry }))
    .sort(
      (a, b) => b.points - a.points || a.name.localeCompare(b.name, "pt")
    )
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  const mine = entries.find((entry) => entry.isMe);

  return {
    ...board,
    me: {
      points,
      rank: points > 0 ? (mine?.rank ?? board.me.rank) : null,
    },
    entries,
  };
}

export function withPendingPoints(board: RankingBoard): RankingBoard {
  if (pendingDelta === 0) return board;
  return bumpRankingBoard(board, pendingDelta);
}

function emit(name: string, detail?: { delta: number }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function awardPoints(points = POINTS_PER_SAVED_WORD) {
  pendingDelta += points;
  emit(POINTS_DELTA_EVENT, { delta: points });
}

export function rollbackPoints(points = POINTS_PER_SAVED_WORD) {
  pendingDelta -= points;
  emit(POINTS_DELTA_EVENT, { delta: -points });
}

export function settlePoints(points = POINTS_PER_SAVED_WORD) {
  pendingDelta -= points;
  emit(POINTS_SYNC_EVENT);
}

export function applyPointsDelta(queryClient: QueryClient, delta: number) {
  if (!delta) return;
  queryClient.setQueriesData<RankingBoard>(
    { queryKey: ["ranking"] },
    (current) => (current ? bumpRankingBoard(current, delta) : current)
  );
}

export function savedImportCount(raw: string): number {
  try {
    const data = JSON.parse(raw) as { words?: Array<{ isSaved?: boolean }> };
    const words = Array.isArray(data?.words) ? data.words : [];
    return words.filter((word) => word?.isSaved).length;
  } catch {
    return 0;
  }
}
