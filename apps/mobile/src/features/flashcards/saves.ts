import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { focusKey, isLessonKind } from "./lesson-queue";
import { type PendingSave, type WordFocus } from "./types";

type Request = <T>(path: string, init?: RequestInit) => Promise<T>;

export async function readFocus(vaultId: number): Promise<WordFocus[]> {
  try {
    const storage = Platform.OS === "web" && typeof localStorage !== "undefined" ? localStorage : null;
    const raw = storage ? storage.getItem(focusKey(vaultId)) : await SecureStore.getItemAsync(focusKey(vaultId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { words?: unknown };
    if (!Array.isArray(parsed.words)) return [];
    const words: WordFocus[] = [];
    for (const item of parsed.words) {
      if (!item || typeof item !== "object") continue;
      const id = (item as { id?: unknown }).id;
      const kinds = (item as { kinds?: unknown }).kinds;
      if (typeof id !== "number" || !Array.isArray(kinds)) continue;
      const clean = kinds.filter(isLessonKind);
      if (clean.length > 0) words.push({ id, kinds: clean });
    }
    return words;
  } catch {
    return [];
  }
}

export async function writeFocus(vaultId: number, words: WordFocus[]) {
  const key = focusKey(vaultId);
  const storage = Platform.OS === "web" && typeof localStorage !== "undefined" ? localStorage : null;
  if (words.length === 0) {
    if (storage) storage.removeItem(key);
    else await SecureStore.deleteItemAsync(key).catch(() => undefined);
    return;
  }
  const raw = JSON.stringify({ words });
  if (storage) storage.setItem(key, raw);
  else await SecureStore.setItemAsync(key, raw);
}

export async function flushSaves(pending: PendingSave[], request: Request) {
  const batch = pending.splice(0);
  for (const save of batch) {
    try {
      if (save.kind === "progress") {
        await request(`/flashcards/words/${save.wordId}/progress`, {
          method: "POST",
          body: JSON.stringify({ confidence: save.confidence, reviewCount: 1 }),
        });
      } else {
        await request(`/flashcards/words/${save.wordId}/result`, {
          method: "POST",
          body: JSON.stringify({ correct: save.correct, challenge: save.challenge }),
        });
      }
    } catch {
      continue;
    }
  }
}
