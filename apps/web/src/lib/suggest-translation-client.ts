import { apiBase } from "@/lib/api/http";

export type SuggestTranslationPayload = {
  word: string;
  sentence?: string | null;
  wordId?: number;
};

export async function requestSuggestTranslation(
  payload: SuggestTranslationPayload
): Promise<string> {
  const response = await fetch(`${apiBase()}/tutor/suggest-translation`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word: payload.word,
      sentence: payload.sentence ?? null,
      wordId: payload.wordId,
    }),
  });
  const data = (await response.json()) as {
    translation?: string;
    error?: string;
  };
  if (!response.ok || !data.translation?.trim()) {
    throw new Error(data.error || "Não foi possível sugerir uma tradução.");
  }
  return data.translation.trim();
}
