import type { Prisma } from "@prisma/client";
import { DEFAULT_STUDY_GOAL_MINUTES, type StudyKind } from "@word-map/shared";
import { getCurrentUser } from "../auth/current-user";
import {
  applyStudyCredit,
  effectiveStreak,
  nextStreakOnComplete,
  normalizeGoalMinutes,
  studyDay,
  studyLastSevenDays,
  studyWeekdayShortPt,
  studyYesterday,
} from "../lib/study";
import { prisma } from "../prisma/client";

export type StudyWeekDay = {
  day: string;
  label: string;
  completed: boolean;
  isToday: boolean;
};

export type StudyToday = {
  day: string;
  goalMinutes: number;
  seconds: number;
  readingSeconds: number;
  practiceSeconds: number;
  completed: boolean;
  currentStreak: number;
  bestStreak: number;
  remainingSeconds: number;
  atRisk: boolean;
  week: StudyWeekDay[];
};

type SettingsRow = {
  id: number;
  userId: number;
  dailyGoalMinutes: number;
  currentStreak: number;
  bestStreak: number;
  lastGoalDate: string | null;
  creditedUntil: Date | null;
};

type StudyDayRow = {
  id: number;
  userId: number;
  day: string;
  seconds: number;
  readingSeconds: number;
  practiceSeconds: number;
  goalMinutes: number;
  completedAt: Date | null;
};

type Tx = Prisma.TransactionClient;

async function requireUserId() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Usuário não autenticado");
  return user.id;
}

/** Ensure a settings row exists (outside the FOR UPDATE transaction). */
export async function ensureUserSettings(userId: number) {
  await prisma.$executeRaw`
    INSERT INTO "UserSettings" ("userId", "useAllVaultsForLinks", "autoTranslateWordPreview", "dailyGoalMinutes", "currentStreak", "bestStreak", "createdAt", "updatedAt")
    VALUES (${userId}, false, false, ${DEFAULT_STUDY_GOAL_MINUTES}, 0, 0, NOW(), NOW())
    ON CONFLICT ("userId") DO NOTHING
  `;
}

async function lockUserSettings(tx: Tx, userId: number): Promise<SettingsRow> {
  const rows = await tx.$queryRaw<SettingsRow[]>`
    SELECT
      id,
      "userId",
      "dailyGoalMinutes",
      "currentStreak",
      "bestStreak",
      "lastGoalDate",
      "creditedUntil"
    FROM "UserSettings"
    WHERE "userId" = ${userId}
    FOR UPDATE
  `;
  const row = rows[0];
  if (!row) throw new Error("Configurações do usuário não encontradas");
  return row;
}

async function findStudyDay(tx: Tx, userId: number, day: string): Promise<StudyDayRow | null> {
  const rows = await tx.$queryRaw<StudyDayRow[]>`
    SELECT id, "userId", day, seconds, "readingSeconds", "practiceSeconds", "goalMinutes", "completedAt"
    FROM "StudyDay"
    WHERE "userId" = ${userId} AND day = ${day}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function loadWeek(
  tx: Tx,
  userId: number,
  today: string,
  now: Date
): Promise<StudyWeekDay[]> {
  const days = studyLastSevenDays(now);
  const from = days[0]!;
  const to = days[days.length - 1]!;
  const rows = await tx.$queryRaw<Array<{ day: string; completedAt: Date | null }>>`
    SELECT day, "completedAt"
    FROM "StudyDay"
    WHERE "userId" = ${userId}
      AND day >= ${from}
      AND day <= ${to}
  `;
  const byDay = new Map(rows.map((row) => [row.day, Boolean(row.completedAt)]));
  return days.map((day) => ({
    day,
    label: studyWeekdayShortPt(day),
    completed: byDay.get(day) ?? false,
    isToday: day === today,
  }));
}

function toToday(input: {
  day: string;
  yesterday: string;
  goalMinutes: number;
  seconds: number;
  readingSeconds: number;
  practiceSeconds: number;
  completedAt: Date | null;
  currentStreak: number;
  bestStreak: number;
  lastGoalDate: string | null;
  week: StudyWeekDay[];
}): StudyToday {
  const streak = effectiveStreak({
    currentStreak: input.currentStreak,
    lastGoalDate: input.lastGoalDate,
    today: input.day,
    yesterday: input.yesterday,
  });
  const goalSeconds = input.goalMinutes * 60;
  const completed = Boolean(input.completedAt);
  return {
    day: input.day,
    goalMinutes: input.goalMinutes,
    seconds: input.seconds,
    readingSeconds: input.readingSeconds,
    practiceSeconds: input.practiceSeconds,
    completed,
    currentStreak: streak,
    bestStreak: Math.max(input.bestStreak, streak),
    remainingSeconds: Math.max(0, goalSeconds - input.seconds),
    atRisk: input.lastGoalDate === input.yesterday && !completed,
    week: input.week,
  };
}

async function loadTodaySnapshot(
  tx: Tx,
  userId: number,
  settings: SettingsRow,
  now: Date
): Promise<StudyToday> {
  const day = studyDay(now);
  const yesterday = studyYesterday(now);
  const study = await findStudyDay(tx, userId, day);
  const goalMinutes = study?.goalMinutes ?? normalizeGoalMinutes(settings.dailyGoalMinutes);
  const week = await loadWeek(tx, userId, day, now);
  return toToday({
    day,
    yesterday,
    goalMinutes,
    seconds: study?.seconds ?? 0,
    readingSeconds: study?.readingSeconds ?? 0,
    practiceSeconds: study?.practiceSeconds ?? 0,
    completedAt: study?.completedAt ?? null,
    currentStreak: settings.currentStreak,
    bestStreak: settings.bestStreak,
    lastGoalDate: settings.lastGoalDate,
    week,
  });
}

async function tryCompleteDayWithGoal(
  tx: Tx,
  userId: number,
  day: string,
  yesterday: string,
  settings: SettingsRow,
  goalMinutes: number,
  now: Date
): Promise<SettingsRow> {
  const updated = await tx.$executeRaw`
    UPDATE "StudyDay"
    SET "completedAt" = ${now}, "updatedAt" = ${now}
    WHERE "userId" = ${userId}
      AND day = ${day}
      AND "completedAt" IS NULL
      AND seconds >= ${goalMinutes * 60}
  `;

  if (Number(updated) !== 1) return settings;

  const next = nextStreakOnComplete({
    currentStreak: settings.currentStreak,
    lastGoalDate: settings.lastGoalDate,
    today: day,
    yesterday,
  });
  const bestStreak = Math.max(settings.bestStreak, next);

  await tx.$executeRaw`
    UPDATE "UserSettings"
    SET
      "currentStreak" = ${next},
      "bestStreak" = ${bestStreak},
      "lastGoalDate" = ${day},
      "updatedAt" = ${now}
    WHERE "userId" = ${userId}
  `;

  return {
    ...settings,
    currentStreak: next,
    bestStreak,
    lastGoalDate: day,
  };
}

export async function getStudyToday(now = new Date()): Promise<StudyToday> {
  const userId = await requireUserId();
  await ensureUserSettings(userId);
  return prisma.$transaction(async (tx) => {
    const settings = await lockUserSettings(tx, userId);
    return loadTodaySnapshot(tx, userId, settings, now);
  });
}

export async function recordStudyHeartbeat(input: {
  kind: StudyKind;
  seconds: number;
  now?: Date;
}): Promise<StudyToday> {
  const userId = await requireUserId();
  const now = input.now ?? new Date();
  await ensureUserSettings(userId);

  return prisma.$transaction(async (tx) => {
    let settings = await lockUserSettings(tx, userId);
    const day = studyDay(now);
    const yesterday = studyYesterday(now);
    const credit = applyStudyCredit({
      now,
      creditedUntil: settings.creditedUntil,
      seconds: input.seconds,
    });

    settings = { ...settings, creditedUntil: credit.creditedUntil };

    await tx.$executeRaw`
      UPDATE "UserSettings"
      SET "creditedUntil" = ${credit.creditedUntil}, "updatedAt" = ${now}
      WHERE "userId" = ${userId}
    `;

    if (credit.applied === 0) {
      return loadTodaySnapshot(tx, userId, settings, now);
    }

    const readingInc = input.kind === "reading" ? credit.applied : 0;
    const practiceInc = input.kind === "practice" ? credit.applied : 0;
    const goalMinutes = normalizeGoalMinutes(settings.dailyGoalMinutes);

    await tx.$executeRaw`
      INSERT INTO "StudyDay" ("userId", day, seconds, "readingSeconds", "practiceSeconds", "goalMinutes", "createdAt", "updatedAt")
      VALUES (${userId}, ${day}, ${credit.applied}, ${readingInc}, ${practiceInc}, ${goalMinutes}, ${now}, ${now})
      ON CONFLICT ("userId", day) DO UPDATE SET
        seconds = "StudyDay".seconds + ${credit.applied},
        "readingSeconds" = "StudyDay"."readingSeconds" + ${readingInc},
        "practiceSeconds" = "StudyDay"."practiceSeconds" + ${practiceInc},
        "goalMinutes" = CASE
          WHEN "StudyDay"."completedAt" IS NULL THEN ${goalMinutes}
          ELSE "StudyDay"."goalMinutes"
        END,
        "updatedAt" = ${now}
    `;

    const study = await findStudyDay(tx, userId, day);
    const effectiveGoal = study?.goalMinutes ?? goalMinutes;

    settings = await tryCompleteDayWithGoal(
      tx,
      userId,
      day,
      yesterday,
      settings,
      effectiveGoal,
      now
    );

    return loadTodaySnapshot(tx, userId, settings, now);
  });
}

export async function updateDailyGoalMinutes(
  dailyGoalMinutes: number,
  now = new Date()
): Promise<StudyToday> {
  const userId = await requireUserId();
  const goalMinutes = normalizeGoalMinutes(dailyGoalMinutes);
  await ensureUserSettings(userId);

  return prisma.$transaction(async (tx) => {
    let settings = await lockUserSettings(tx, userId);
    const day = studyDay(now);
    const yesterday = studyYesterday(now);

    settings = { ...settings, dailyGoalMinutes: goalMinutes };

    await tx.$executeRaw`
      UPDATE "UserSettings"
      SET "dailyGoalMinutes" = ${goalMinutes}, "updatedAt" = ${now}
      WHERE "userId" = ${userId}
    `;

    const existing = await findStudyDay(tx, userId, day);
    if (existing) {
      await tx.$executeRaw`
        UPDATE "StudyDay"
        SET "goalMinutes" = ${goalMinutes}, "updatedAt" = ${now}
        WHERE id = ${existing.id}
      `;
      settings = await tryCompleteDayWithGoal(
        tx,
        userId,
        day,
        yesterday,
        settings,
        goalMinutes,
        now
      );
    }

    return loadTodaySnapshot(tx, userId, settings, now);
  });
}
