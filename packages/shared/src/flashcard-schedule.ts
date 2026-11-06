const ZONE = "America/Sao_Paulo";

export const MAX_CONFIDENCE = 4;

const INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 21,
};

export function reviewIntervalDays(confidence: number): number {
  const level = Math.min(MAX_CONFIDENCE, Math.max(1, Math.round(confidence)));
  return INTERVAL_DAYS[level] ?? 1;
}

export function isMaxConfidence(confidence: number): boolean {
  return Math.round(confidence) >= MAX_CONFIDENCE;
}

/** Todas as palavras do pool já estão no nível máximo. */
export function allWordsMastered(words: ReadonlyArray<{ confidence: number }>): boolean {
  return words.length > 0 && words.every((word) => isMaxConfidence(word.confidence));
}

export function calendarDay(value: Date, timeZone = ZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function dayNumber(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(year, (month ?? 1) - 1, day ?? 1) / 86_400_000);
}

export function calendarDaysBetween(from: Date, to: Date): number {
  return dayNumber(calendarDay(to)) - dayNumber(calendarDay(from));
}

function asDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

function nowMs(now: Date | number) {
  return typeof now === "number" ? now : now.getTime();
}

/** Legacy interval table — only used when dueAt is null (pre-migration). */
export function isWordDueLegacy(
  word: { confidence: number; lastPractice?: Date | string | null },
  now: Date | number = Date.now()
) {
  if (!word.lastPractice) return true;
  const days = calendarDaysBetween(new Date(word.lastPractice), asDate(now));
  return days >= reviewIntervalDays(word.confidence);
}

export function isWordDue(
  word: {
    confidence: number;
    lastPractice?: Date | string | null;
    dueAt?: Date | string | null;
  },
  now: Date | number = Date.now()
) {
  if (word.dueAt != null) {
    const due = word.dueAt instanceof Date ? word.dueAt : new Date(word.dueAt);
    return due.getTime() <= nowMs(now);
  }
  return isWordDueLegacy(word, now);
}

export function latenessDays(
  word: {
    confidence: number;
    lastPractice?: Date | string | null;
    dueAt?: Date | string | null;
  },
  now: Date | number = Date.now()
) {
  if (word.dueAt != null) {
    const due = word.dueAt instanceof Date ? word.dueAt : new Date(word.dueAt);
    const lateMs = nowMs(now) - due.getTime();
    if (lateMs <= 0) return 0;
    return Math.min(30, Math.floor(lateMs / 86_400_000));
  }
  if (!word.lastPractice) return 30;
  const days = calendarDaysBetween(new Date(word.lastPractice), asDate(now));
  return Math.min(30, Math.max(0, days - reviewIntervalDays(word.confidence)));
}

export function daysUntilDue(
  word: {
    confidence: number;
    lastPractice?: Date | string | null;
    dueAt?: Date | string | null;
  },
  now: Date | number = Date.now()
) {
  if (word.dueAt != null) {
    const due = word.dueAt instanceof Date ? word.dueAt : new Date(word.dueAt);
    const leftMs = due.getTime() - nowMs(now);
    if (leftMs <= 0) return 0;
    return Math.ceil(leftMs / 86_400_000);
  }
  if (!word.lastPractice) return 0;
  const days = calendarDaysBetween(new Date(word.lastPractice), asDate(now));
  return Math.max(0, reviewIntervalDays(word.confidence) - days);
}
