import type { ReviewItem } from "@/lib/flashcard-review";
import { apiBase } from "@/lib/api/http";
import { REVIEW_ITEM_LIMIT } from "@/lib/flashcard-review";

export type SavedCloze = {
  wordId: number;
  sentence: string;
  answer: string;
};

export async function requestWordClozes(wordIds: number[]): Promise<SavedCloze[]> {
  const unique = [...new Set(wordIds)];
  const saved: SavedCloze[] = [];

  for (let index = 0; index < unique.length; index += 20) {
    const batch = unique.slice(index, index + 20);
    try {
      const response = await fetch(`${apiBase()}/flashcards/cloze`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordIds: batch }),
      });
      if (!response.ok) continue;
      const data = (await response.json()) as { clozes?: unknown };
      if (!Array.isArray(data.clozes)) continue;
      for (const item of data.clozes) {
        if (!item || typeof item !== "object") continue;
        const wordId = (item as { wordId?: unknown }).wordId;
        const sentence = (item as { sentence?: unknown }).sentence;
        const answer = (item as { answer?: unknown }).answer;
        if (typeof wordId !== "number" || typeof sentence !== "string") continue;
        if (typeof answer !== "string" || !sentence.trim() || !answer.trim()) {
          continue;
        }
        saved.push({ wordId, sentence, answer });
      }
    } catch {
      continue;
    }
  }

  return saved;
}

export async function requestSessionReview(
  items: ReviewItem[]
): Promise<string | null> {
  const payload = items.slice(0, REVIEW_ITEM_LIMIT);
  if (payload.length === 0) return null;

  try {
    const response = await fetch(`${apiBase()}/flashcards/review`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { text?: unknown };
    return typeof data.text === "string" && data.text.trim() ? data.text : null;
  } catch {
    return null;
  }
}
