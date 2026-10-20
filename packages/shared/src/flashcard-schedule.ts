const ZONE = "America/Sao_Paulo";

const INTERVAL_DAYS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 21,
};

export function reviewIntervalDays(confidence: number): number {
  const level = Math.min(4, Math.max(1, Math.round(confidence)));
  return INTERVAL_DAYS[level] ?? 1;
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

export function isWordDue(
  word: { confidence: number; lastPractice?: Date | string | null },
  now: Date | number = Date.now()
) {
  if (!word.lastPractice) return true;
  const days = calendarDaysBetween(new Date(word.lastPractice), asDate(now));
  return days >= reviewIntervalDays(word.confidence);
}

export function latenessDays(
  word: { confidence: number; lastPractice?: Date | string | null },
  now: Date | number = Date.now()
) {
  if (!word.lastPractice) return 30;
  const days = calendarDaysBetween(new Date(word.lastPractice), asDate(now));
  return Math.min(30, Math.max(0, days - reviewIntervalDays(word.confidence)));
}

export function daysUntilDue(
  word: { confidence: number; lastPractice?: Date | string | null },
  now: Date | number = Date.now()
) {
  if (!word.lastPractice) return 0;
  const days = calendarDaysBetween(new Date(word.lastPractice), asDate(now));
  return Math.max(0, reviewIntervalDays(word.confidence) - days);
}
