export type Word = {
  id: number;
  name: string;
  grammaticalClass: string;
  category: string | null;
  translations: string[];
  notes?: string | null;
  confidence: number;
  vaultId: number;
};

export type Vault = {
  id: number;
  name: string;
  words: Word[];
};

export type BookListItem = {
  id: number;
  title: string;
  description: string | null;
  coverUrl?: string | null;
  isOfficial: boolean;
  ownerId: number;
  chapterCount: number;
  inLibrary: boolean;
};

export type ChapterSummary = {
  id: number;
  bookId: number;
  title: string;
  order: number;
};

export type BookDetail = BookListItem & {
  chapters: ChapterSummary[];
  canEdit: boolean;
};

export type ChapterDetail = {
  id: number;
  bookId: number;
  title: string;
  content: string;
  order: number;
  canEdit: boolean;
  bookTitle: string;
};

export type ReadingPosition = {
  pageIndex: number;
  paragraphIndex: number;
};

export const GRAMMATICAL_CLASSES: Array<[string, string]> = [
  ["substantivo", "Substantivo"],
  ["verbo", "Verbo"],
  ["adjetivo", "Adjetivo"],
  ["adverbio", "Advérbio"],
  ["pronome", "Pronome"],
  ["preposicao", "Preposição"],
  ["conjuncao", "Conjunção"],
  ["interjeicao", "Interjeição"],
  ["phrasal-verb", "Phrasal verb"],
  ["frase", "Frase"],
];

export function classLabel(value: string) {
  return GRAMMATICAL_CLASSES.find(([key]) => key === value)?.[1] ?? value;
}

export function countLabel(count: number, one: string, many: string) {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}
