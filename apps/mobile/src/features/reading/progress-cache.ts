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

function storageKey(userId: number, chapterId: number) {
  return `${STORAGE_PREFIX}${userId}:${chapterId}`;
}

function bookResumeKey(userId: number, bookId: number) {
  return `${BOOK_RESUME_PREFIX}${userId}:${bookId}`;
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
  userId: number,
  chapterId: number
): Promise<CachedReadingProgress | null> {
  if (!(userId > 0)) return null;
  try {
    return parseCached(await readRaw(storageKey(userId, chapterId)), chapterId);
  } catch {
    return null;
  }
}

export async function writeProgressCache(
  userId: number,
  chapterId: number,
  progress: {
    pageIndex: number;
    paragraphIndex: number;
    contentOffset: number | null;
  }
): Promise<void> {
  if (!(userId > 0)) return;
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
    await writeRaw(storageKey(userId, chapterId), JSON.stringify(payload));
  } catch {
    // cache é best-effort
  }
}

/** Último capítulo aberto neste livro (resume local, por usuário). */
export async function readBookResume(userId: number, bookId: number): Promise<number | null> {
  if (!(userId > 0)) return null;
  try {
    const raw = await readRaw(bookResumeKey(userId, bookId));
    if (!raw) return null;
    const chapterId = Number(raw);
    return Number.isFinite(chapterId) && chapterId > 0 ? chapterId : null;
  } catch {
    return null;
  }
}

export async function writeBookResume(
  userId: number,
  bookId: number,
  chapterId: number
): Promise<void> {
  if (!(userId > 0) || !(bookId > 0) || !(chapterId > 0)) return;
  try {
    await writeRaw(bookResumeKey(userId, bookId), String(chapterId));
  } catch {
    // cache é best-effort
  }
}

type ResumeChapterCandidate = {
  id: number;
  reachedEndAt?: string | null;
  progressUpdatedAt?: string | null;
};

/** Escolhe o capítulo para continuar: cache local → último progresso → próximo incompleto. */
export function pickResumeChapter<T extends ResumeChapterCandidate>(
  chapters: T[],
  resumeId: number | null
): T | null {
  if (chapters.length === 0) return null;
  if (resumeId != null) {
    const fromLocal = chapters.find((chapter) => chapter.id === resumeId);
    if (fromLocal) return fromLocal;
  }
  let latest: T | null = null;
  let latestTs = 0;
  for (const chapter of chapters) {
    if (!chapter.progressUpdatedAt) continue;
    const ts = Date.parse(chapter.progressUpdatedAt);
    if (!Number.isFinite(ts) || ts <= latestTs) continue;
    latest = chapter;
    latestTs = ts;
  }
  if (latest) return latest;
  return chapters.find((chapter) => !chapter.reachedEndAt) ?? chapters[0] ?? null;
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
