import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const XP_KEY = "wordmap-practice-xp";
const VAULT_KEY = "wordmap-review-vault";
const DAY_KEY = "wordmap-practice-day";

/** XP base to leave level 1. Each next level multiplies the cost. */
export const XP_BASE = 100;
/** Growth factor per level (soft RPG curve). */
export const XP_GROWTH = 1.22;
/** Meta diária de palavras revisadas (anel do progresso). */
export const DAILY_WORD_GOAL = 10;
const MAX_LEVEL = 9999;

export type DayPracticeWord = { id: number; name: string };

export type DayPracticeState = {
  day: string;
  xp: number;
  words: DayPracticeWord[];
};

function calendarDayKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function emptyDayPractice(day = calendarDayKey()): DayPracticeState {
  return { day, xp: 0, words: [] };
}

export type PracticeXpState = {
  totalXp: number;
  level: number;
  /** 0–1 progress within the current level */
  progress: number;
  /** XP earned inside the current level */
  xpInLevel: number;
  /** XP needed to reach the next level */
  xpToNext: number;
  /** Total XP required to clear the current level */
  xpForLevel: number;
};

function storageGet(key: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return Promise.resolve(localStorage.getItem(key));
  }
  return AsyncStorage.getItem(key);
}

function storageSet(key: string, value: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(key, value);
    return Promise.resolve();
  }
  return AsyncStorage.setItem(key, value);
}

/** XP needed to go from `level` → `level + 1`. */
export function xpToAdvanceFrom(level: number) {
  const n = Math.max(1, Math.floor(level));
  return Math.max(XP_BASE, Math.round(XP_BASE * Math.pow(XP_GROWTH, n - 1)));
}

export function practiceXpFromTotal(totalXp: number): PracticeXpState {
  const safe = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = safe;

  while (level < MAX_LEVEL) {
    const need = xpToAdvanceFrom(level);
    if (remaining < need) {
      return {
        totalXp: safe,
        level,
        progress: need <= 0 ? 0 : remaining / need,
        xpInLevel: remaining,
        xpToNext: need - remaining,
        xpForLevel: need,
      };
    }
    remaining -= need;
    level += 1;
  }

  const need = xpToAdvanceFrom(MAX_LEVEL);
  return {
    totalXp: safe,
    level: MAX_LEVEL,
    progress: 1,
    xpInLevel: need,
    xpToNext: 0,
    xpForLevel: need,
  };
}

export async function readPracticeXp(): Promise<PracticeXpState> {
  try {
    const raw = await storageGet(XP_KEY);
    const total = raw ? Number(raw) : 0;
    return practiceXpFromTotal(Number.isFinite(total) ? total : 0);
  } catch {
    return practiceXpFromTotal(0);
  }
}

export async function addPracticeXp(amount: number): Promise<PracticeXpState> {
  const gain = Math.max(0, Math.floor(amount));
  if (gain <= 0) return readPracticeXp();
  const current = await readPracticeXp();
  const next = practiceXpFromTotal(current.totalXp + gain);
  await storageSet(XP_KEY, String(next.totalXp));
  if (gain > 0) {
    const day = await readDayPractice();
    await storageSet(DAY_KEY, JSON.stringify({ ...day, xp: day.xp + gain }));
  }
  return next;
}

export async function readDayPractice(): Promise<DayPracticeState> {
  try {
    const today = calendarDayKey();
    const raw = await storageGet(DAY_KEY);
    if (!raw) return emptyDayPractice(today);
    const parsed = JSON.parse(raw) as Partial<DayPracticeState>;
    if (!parsed || parsed.day !== today || !Array.isArray(parsed.words)) {
      return emptyDayPractice(today);
    }
    return {
      day: today,
      xp: Math.max(0, Math.floor(Number(parsed.xp) || 0)),
      words: parsed.words
        .filter((item) => item && typeof item.id === "number" && typeof item.name === "string")
        .map((item) => ({ id: item.id, name: item.name.trim() || `#${item.id}` })),
    };
  } catch {
    return emptyDayPractice();
  }
}

export async function recordDayReview(word: DayPracticeWord): Promise<DayPracticeState> {
  const current = await readDayPractice();
  if (current.words.some((item) => item.id === word.id)) return current;
  const next: DayPracticeState = {
    ...current,
    words: [{ id: word.id, name: word.name.trim() || `#${word.id}` }, ...current.words].slice(0, 80),
  };
  await storageSet(DAY_KEY, JSON.stringify(next));
  return next;
}

/** `null` = all vaults ("Tudo") */
export async function readReviewVaultId(): Promise<number | null> {
  try {
    const raw = await storageGet(VAULT_KEY);
    if (!raw || raw === "all") return null;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export async function writeReviewVaultId(vaultId: number | null) {
  await storageSet(VAULT_KEY, vaultId == null ? "all" : String(vaultId));
}
