export interface DictionaryMeaning {
  partOfSpeech?: string;
  definitions?: Array<{ definition?: string; example?: string }>;
}

export interface DictionaryEntry {
  word?: string;
  phonetic?: string;
  meanings?: DictionaryMeaning[];
}

export async function fetchDictionaryEntry(
  word: string
): Promise<DictionaryEntry | null> {
  try {
    const encoded = encodeURIComponent(word.toLowerCase().trim());
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encoded}`
    );
    if (!response.ok) return null;
    const data = (await response.json()) as DictionaryEntry[];
    return data[0] ?? null;
  } catch (error) {
    console.error("Erro ao buscar palavra no dicionário:", error);
    return null;
  }
}

export function extractDictionaryTranslations(
  entry: DictionaryEntry | null,
  fallback: string
): string[] {
  const definitions =
    entry?.meanings?.[0]?.definitions
      ?.slice(0, 2)
      ?.map((def) => def.definition)
      .filter((def): def is string => Boolean(def)) ?? [];

  return definitions.length > 0 ? definitions : [fallback];
}

export function extractDictionaryGrammaticalClass(
  entry: DictionaryEntry | null
): string {
  return entry?.meanings?.[0]?.partOfSpeech ?? "substantivo";
}
