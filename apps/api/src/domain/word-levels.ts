import { getCurrentUser } from "../auth/current-user";
import { prisma } from "../prisma/client";

export type WordLevelPoint = {
  date: string;
  level: number;
};

const ZONE = "America/Sao_Paulo";

function clampLevel(level: number) {
  return Math.min(4, Math.max(1, Math.round(level)));
}

export function levelDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function recordWordLevel(wordId: number, level: number) {
  await prisma.$executeRaw`
    INSERT INTO "WordLevelMark" ("wordId", "level")
    VALUES (${wordId}, ${clampLevel(level)})
  `;
}

export async function listWordLevels(wordId: number): Promise<WordLevelPoint[]> {
  const user = await getCurrentUser();
  if (!user || !Number.isInteger(wordId) || wordId <= 0) return [];
  const word = await prisma.word.findFirst({
    where: { id: wordId, vault: { userId: user.id } },
    select: { confidence: true },
  });
  if (!word) return [];

  const marks = await prisma.$queryRaw<Array<{ level: number; createdAt: Date }>>`
    SELECT "level", "createdAt"
    FROM "WordLevelMark"
    WHERE "wordId" = ${wordId}
    ORDER BY "createdAt" ASC
  `;
  if (marks.length === 0) {
    return [{ date: levelDay(new Date()), level: clampLevel(word.confidence) }];
  }

  const points: WordLevelPoint[] = [];
  for (const mark of marks) {
    const level = clampLevel(Number(mark.level));
    const date = levelDay(new Date(mark.createdAt));
    const previous = points[points.length - 1];
    if (previous && previous.date === date && previous.level === level) continue;
    points.push({ date, level });
  }
  return points;
}
