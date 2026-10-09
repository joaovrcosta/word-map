export interface DictionaryMeaning {
  partOfSpeech?: string;
  definitions?: Array<{ definition?: string; example?: string }>;
}

export interface DictionaryEntry {
  word?: string;
  phonetic?: string;
  meanings?: DictionaryMeaning[];
}

const DATAMUSE_POS: Record<string, string> = {
  n: "noun",
  v: "verb",
  adj: "adjective",
  adv: "adverb",
  u: "noun",
};

async function fetchJson(
  url: string,
  timeoutMs: number,
  headers?: Record<string, string>
): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...headers,
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar dicionário:", url, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasMeanings(entry: DictionaryEntry | null | undefined): boolean {
  return Boolean(entry?.meanings?.some((meaning) => meaning.definitions?.length));
}

async function fetchFreeDictionary(word: string): Promise<DictionaryEntry[]> {
  const encoded = encodeURIComponent(word);
  const data = await fetchJson(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encoded}`,
    2500
  );
  if (!Array.isArray(data)) return [];
  return data.filter((entry) => hasMeanings(entry as DictionaryEntry)) as DictionaryEntry[];
}

async function fetchDatamuse(word: string): Promise<DictionaryEntry[]> {
  const encoded = encodeURIComponent(word);
  const data = await fetchJson(
    `https://api.datamuse.com/words?sp=${encoded}&md=d&max=8`,
    4000
  );
  if (!Array.isArray(data)) return [];

  const match =
    data.find(
      (item: { word?: string; defs?: string[] }) =>
        item.word?.toLowerCase() === word && Array.isArray(item.defs) && item.defs.length > 0
    ) ??
    data.find(
      (item: { defs?: string[] }) => Array.isArray(item.defs) && item.defs.length > 0
    );

  if (!match?.defs?.length) return [];

  const grouped = new Map<string, Array<{ definition: string }>>();
  for (const raw of match.defs as string[]) {
    const [posCode, ...rest] = raw.split("\t");
    const definition = rest.join("\t").replace(/^"|"$/g, "").trim();
    if (!definition) continue;
    const partOfSpeech = DATAMUSE_POS[posCode] || posCode || "noun";
    const list = grouped.get(partOfSpeech) ?? [];
    list.push({ definition });
    grouped.set(partOfSpeech, list);
  }

  if (grouped.size === 0) return [];

  return [
    {
      word: match.word || word,
      meanings: Array.from(grouped.entries()).map(([partOfSpeech, definitions]) => ({
        partOfSpeech,
        definitions: definitions.slice(0, 3),
      })),
    },
  ];
}

async function fetchWiktionary(word: string): Promise<DictionaryEntry[]> {
  const encoded = encodeURIComponent(word);
  const data = await fetchJson(
    `https://en.wiktionary.org/api/rest_v1/page/definition/${encoded}`,
    4000,
    {
      "User-Agent": "WordMap/1.0 (language-learning app)",
      "Api-User-Agent": "WordMap/1.0 (language-learning app)",
    }
  );
  if (!data || typeof data !== "object") return [];

  const english = (data as { en?: Array<{ partOfSpeech?: string; definitions?: Array<{ definition?: string; examples?: string[] }> }> }).en;
  if (!Array.isArray(english) || english.length === 0) return [];

  const meanings: DictionaryMeaning[] = english.slice(0, 3).map((item) => ({
    partOfSpeech: item.partOfSpeech?.toLowerCase() || "noun",
    definitions: (item.definitions ?? [])
      .slice(0, 2)
      .map((definition) => ({
        definition: stripHtml(definition.definition || ""),
        example: definition.examples?.[0]
          ? stripHtml(definition.examples[0])
          : undefined,
      }))
      .filter((definition) => definition.definition),
  }));

  if (!meanings.some((meaning) => meaning.definitions?.length)) return [];

  return [{ word, meanings }];
}

export async function fetchDictionaryEntries(
  word: string
): Promise<DictionaryEntry[]> {
  const cleaned = word.toLowerCase().trim();
  if (!cleaned) return [];

  const fromDatamuse = await fetchDatamuse(cleaned);
  if (fromDatamuse.length) return fromDatamuse;

  const fromWiktionary = await fetchWiktionary(cleaned);
  if (fromWiktionary.length) return fromWiktionary;

  return fetchFreeDictionary(cleaned);
}

export async function fetchDictionaryEntry(
  word: string
): Promise<DictionaryEntry | null> {
  const entries = await fetchDictionaryEntries(word);
  return entries[0] ?? null;
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
