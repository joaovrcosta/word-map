import {
  DEFAULT_STUDY_GOAL_MINUTES,
  STUDY_CREDIT_WINDOW_MS,
  STUDY_HEARTBEAT_MAX_SECONDS,
  type StudyGoalMinutes,
} from "@word-map/shared";

export const STUDY_ZONE = "America/Sao_Paulo";

export function studyDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDY_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function studyCalendarParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDY_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: read("year"), month: read("month"), day: read("day") };
}

function noonUtcForSpDate(year: number, month: number, day: number) {
  return Date.UTC(year, month - 1, day, 12, 0, 0);
}

/** Previous calendar day in America/Sao_Paulo, as YYYY-MM-DD. */
export function studyYesterday(now: Date): string {
  const { year, month, day } = studyCalendarParts(now);
  return studyDay(new Date(noonUtcForSpDate(year, month, day) - 24 * 60 * 60 * 1000));
}

/** Last 7 calendar days in SP ending today (oldest → newest). */
export function studyLastSevenDays(now: Date): string[] {
  const { year, month, day } = studyCalendarParts(now);
  const noon = noonUtcForSpDate(year, month, day);
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(studyDay(new Date(noon - i * 24 * 60 * 60 * 1000)));
  }
  return days;
}

const WEEKDAY_SHORT_PT = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."] as const;

export function studyWeekdayShortPt(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d, 15, 0, 0)).getUTCDay();
  return WEEKDAY_SHORT_PT[weekday] ?? "";
}

export function clampHeartbeatSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  return Math.min(STUDY_HEARTBEAT_MAX_SECONDS, Math.max(0, Math.floor(seconds)));
}

export type CreditResult = {
  applied: number;
  creditedUntil: Date;
};

/**
 * Rate-limit study credit by wall-clock. Anchor advances only by applied seconds.
 * Initial window capped at STUDY_CREDIT_WINDOW_MS so long pauses don't bank credit.
 */
export function applyStudyCredit(input: {
  now: Date;
  creditedUntil: Date | null;
  seconds: number;
}): CreditResult {
  const seconds = clampHeartbeatSeconds(input.seconds);
  const nowMs = input.now.getTime();
  const fallback = nowMs - seconds * 1000;
  const previous = input.creditedUntil?.getTime() ?? fallback;
  const anchorMs = Math.max(previous, nowMs - STUDY_CREDIT_WINDOW_MS);
  const allowed = Math.max(0, Math.floor((nowMs - anchorMs) / 1000));
  const applied = Math.min(seconds, allowed);
  const creditedUntil = new Date(Math.min(nowMs, anchorMs + applied * 1000));
  return { applied, creditedUntil };
}

export function effectiveStreak(input: {
  currentStreak: number;
  lastGoalDate: string | null;
  today: string;
  yesterday: string;
}): number {
  if (!input.lastGoalDate) return 0;
  if (input.lastGoalDate === input.today || input.lastGoalDate === input.yesterday) {
    return Math.max(0, input.currentStreak);
  }
  return 0;
}

export function nextStreakOnComplete(input: {
  currentStreak: number;
  lastGoalDate: string | null;
  today: string;
  yesterday: string;
}): number {
  if (input.lastGoalDate === input.today) {
    return Math.max(0, input.currentStreak);
  }
  if (input.lastGoalDate === input.yesterday) {
    return Math.max(0, input.currentStreak) + 1;
  }
  return 1;
}

export function normalizeGoalMinutes(value: unknown): StudyGoalMinutes {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    (value === 5 || value === 10 || value === 15 || value === 20)
  ) {
    return value;
  }
  return DEFAULT_STUDY_GOAL_MINUTES;
}
