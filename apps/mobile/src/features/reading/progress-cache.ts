import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_PREFIX = "wordmap-reading-progress:";
const BOOK_RESUME_PREFIX = "wordmap-book-resume:";

export type CachedReadingProgress = {
  chapterId: number;
  pageIndex: number;
  paragraphIndex: number;
  contentOffset: number | null;
  updatedAt: number;
};

function storageKey(chapterId: number) {
  return `${STORAGE_PREFIX}${chapterId}`;
}

function bookResumeKey(bookId: number) {
  return `${BOOK_RESUME_PREFIX}${bookId}`;
}

async function readRaw(key: string): Promise<string | null> {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return localStorage.getItem(key);
  }
  return AsyncStorage.getItem(key);
}

async function writeRaw(key: string, value: string): Promise<void> {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

function parseCached(raw: string | null, chapterId: number): CachedReadingProgress | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<CachedReadingProgress>;
    if (typeof data.chapterId === "number" && data.chapterId !== chapterId) return null;
    if (typeof data.pageIndex !== "number" || !Number.isFinite(data.pageIndex)) return null;
    if (typeof data.paragraphIndex !== "number" || !Number.isFinite(data.paragraphIndex)) {
      return null;
    }
    const contentOffset =
      data.contentOffset == null
        ? null
        : typeof data.contentOffset === "number" && Number.isFinite(data.contentOffset)
          ? Math.max(0, Math.floor(data.contentOffset))
          : null;
    return {
      chapterId,
      pageIndex: Math.max(0, Math.floor(data.pageIndex)),
      paragraphIndex: Math.max(0, Math.floor(data.paragraphIndex)),
      contentOffset,
      updatedAt:
        typeof data.updatedAt === "number" && Number.isFinite(data.updatedAt)
          ? data.updatedAt
          : 0,
    };
  } catch {
    return null;
  }
}

export async function readProgressCache(
  chapterId: number
): Promise<CachedReadingProgress | null> {
  try {
    return parseCached(await readRaw(storageKey(chapterId)), chapterId);
  } catch {
    return null;
  }
}

export async function writeProgressCache(
  chapterId: number,
  progress: {
    pageIndex: number;
    paragraphIndex: number;
    contentOffset: number | null;
  }
): Promise<void> {
  const payload: CachedReadingProgress = {
    chapterId,
    pageIndex: Math.max(0, Math.floor(progress.pageIndex)),
    paragraphIndex: Math.max(0, Math.floor(progress.paragraphIndex)),
    contentOffset:
      progress.contentOffset == null
        ? null
        : Math.max(0, Math.floor(progress.contentOffset)),
    updatedAt: Date.now(),
  };
  try {
    await writeRaw(storageKey(chapterId), JSON.stringify(payload));
  } catch {
    // cache é best-effort
  }
}

/** Último capítulo aberto neste livro (resume local). */
export async function readBookResume(bookId: number): Promise<number | null> {
  try {
    const raw = await readRaw(bookResumeKey(bookId));
    if (!raw) return null;
    const chapterId = Number(raw);
    return Number.isFinite(chapterId) && chapterId > 0 ? chapterId : null;
  } catch {
    return null;
  }
}

export async function writeBookResume(bookId: number, chapterId: number): Promise<void> {
  if (!(bookId > 0) || !(chapterId > 0)) return;
  try {
    await writeRaw(bookResumeKey(bookId), String(chapterId));
  } catch {
    // cache é best-effort
  }
}

/** Escolhe a âncora mais avançada entre cache local e API. */
export function pickReadingProgress(
  local: CachedReadingProgress | null,
  remote: {
    pageIndex: number;
    paragraphIndex: number;
    contentOffset?: number | null;
  } | null
): {
  pageIndex: number;
  paragraphIndex: number;
  contentOffset: number | null;
  source: "local" | "remote" | "none";
} {
  if (!local && !remote) {
    return { pageIndex: 0, paragraphIndex: 0, contentOffset: null, source: "none" };
  }
  if (!local && remote) {
    return {
      pageIndex: remote.pageIndex,
      paragraphIndex: remote.paragraphIndex,
      contentOffset: remote.contentOffset ?? null,
      source: "remote",
    };
  }
  if (local && !remote) {
    return {
      pageIndex: local.pageIndex,
      paragraphIndex: local.paragraphIndex,
      contentOffset: local.contentOffset,
      source: "local",
    };
  }
  const localOffset = local!.contentOffset ?? 0;
  const remoteOffset = remote!.contentOffset ?? 0;
  // Mesmo aparelho: local costuma ser mais fresco. API à frente = outro device.
  if (localOffset >= remoteOffset) {
    return {
      pageIndex: local!.pageIndex,
      paragraphIndex: local!.paragraphIndex,
      contentOffset: local!.contentOffset,
      source: "local",
    };
  }
  return {
    pageIndex: remote!.pageIndex,
    paragraphIndex: remote!.paragraphIndex,
    contentOffset: remote!.contentOffset ?? null,
    source: "remote",
  };
}
