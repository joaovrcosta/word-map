import type { DictionaryEntry } from "@/lib/dictionary";

export async function lookupWordInfo(
  word: string
): Promise<DictionaryEntry | null> {
  try {
    const response = await fetch(
      `/api/dictionary?word=${encodeURIComponent(word.trim())}`
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      entry?: DictionaryEntry | null;
    };
    return data.entry ?? null;
  } catch (error) {
    console.error("Erro ao buscar palavra:", error);
    return null;
  }
}

export async function lookupWordEntries(
  word: string
): Promise<DictionaryEntry[]> {
  try {
    const response = await fetch(
      `/api/dictionary?word=${encodeURIComponent(word.trim())}`
    );
    if (!response.ok) return [];
    const data = (await response.json()) as { entries?: DictionaryEntry[] };
    return Array.isArray(data.entries) ? data.entries : [];
  } catch (error) {
    console.error("Erro ao buscar na API:", error);
    return [];
  }
}
