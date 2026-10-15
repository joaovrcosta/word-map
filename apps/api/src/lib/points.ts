import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";

export const POINTS_PER_SAVED_WORD = 10;

export const RANKING_PERIODS = ["week", "month", "lifetime"] as const;
export type RankingPeriod = (typeof RANKING_PERIODS)[number];

const SAO_PAULO_OFFSET = "-03:00";

export function isRankingPeriod(value: string): value is RankingPeriod {
  return (RANKING_PERIODS as readonly string[]).includes(value);
}

export function periodStart(period: RankingPeriod, now = new Date()): Date | null {
  if (period === "lifetime") return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const year = Number(read("year"));
  const month = Number(read("month"));
  const day = Number(read("day"));

  if (period === "month") {
    return new Date(
      `${year}-${String(month).padStart(2, "0")}-01T00:00:00${SAO_PAULO_OFFSET}`
    );
  }

  const weekday = read("weekday");
  const mondayOffset: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const start = new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00${SAO_PAULO_OFFSET}`
  );
  start.setUTCDate(start.getUTCDate() - (mondayOffset[weekday] ?? 0));
  return start;
}

export async function awardSavedWordPoints(
  userId: number,
  wordId: number,
  createdAt?: Date
): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO "PointAward" ("userId", "wordId", "points", "createdAt")
      VALUES (${userId}, ${wordId}, ${POINTS_PER_SAVED_WORD}, ${createdAt ?? new Date()})
      ON CONFLICT ("wordId") DO NOTHING
    `;
  } catch (error) {
    console.error("Falha ao registrar pontos:", error);
  }
}

export type RankingEntry = {
  rank: number;
  userId: number;
  name: string;
  points: number;
  isMe: boolean;
};

export type RankingBoard = {
  period: RankingPeriod;
  pointsPerWord: number;
  me: { points: number; rank: number | null };
  entries: RankingEntry[];
};

export async function getRankingBoard(
  userId: number,
  period: RankingPeriod
): Promise<RankingBoard> {
  const start = periodStart(period);
  const since = start
    ? Prisma.sql`WHERE p."createdAt" >= ${start}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<
    Array<{ id: number; name: string; points: number }>
  >`
    SELECT u.id, u.name, COALESCE(SUM(p.points), 0)::int AS points
    FROM "PointAward" p
    JOIN "User" u ON u.id = p."userId"
    ${since}
    GROUP BY u.id, u.name
    ORDER BY points DESC, u.name ASC
    LIMIT 20
  `;

  const mineSince = start
    ? Prisma.sql`AND p."createdAt" >= ${start}`
    : Prisma.empty;
  const mine = await prisma.$queryRaw<Array<{ points: number }>>`
    SELECT COALESCE(SUM(p.points), 0)::int AS points
    FROM "PointAward" p
    WHERE p."userId" = ${userId}
    ${mineSince}
  `;
  const myPoints = Number(mine[0]?.points ?? 0);

  let rank: number | null = null;
  if (myPoints > 0) {
    const higher = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT p."userId"
        FROM "PointAward" p
        ${since}
        GROUP BY p."userId"
        HAVING SUM(p.points) > ${myPoints}
      ) ranked
    `;
    rank = Number(higher[0]?.count ?? 0) + 1;
  }

  return {
    period,
    pointsPerWord: POINTS_PER_SAVED_WORD,
    me: { points: myPoints, rank },
    entries: rows.map((row, index) => ({
      rank: index + 1,
      userId: row.id,
      name: row.name.trim() || "Aluno",
      points: Number(row.points),
      isMe: row.id === userId,
    })),
  };
}
