export interface Vault {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  words: Word[];
  isDeleting?: boolean;
}

export interface Word {
  id: number;
  name: string;
  grammaticalClass: string;
  category: string | null;
  translations: string[];
  notes?: string | null;
  confidence: number;
  lastPractice?: Date | null;
  isSaved: boolean;
  frequency: number;
  vaultId: number;
  createdAt: Date;
}

export interface CreateWordData {
  name: string;
  grammaticalClass: string;
  category?: string;
  translations: string[];
  notes?: string | null;
  confidence: number;
  vaultId: number;
  isSaved?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  origin?: {
    sentence?: string | null;
    sourceTitle?: string | null;
    sourceKind?: "book" | "text" | "manual";
  };
}

export interface SearchResult {
  word: Word;
  vault: {
    id: number;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    userId: number;
  };
}

export interface Text {
  id: number;
  title: string;
  content: string;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  isCatalog?: boolean;
  summary?: string | null;
  level?: string | null;
}

export type SelectionSaveType = "phrasal-verb" | "word" | "frase";

export interface SemanticConnection {
  id: number;
  title: string;
  description: string;
  connectionType:
    | "semantic"
    | "grammatical"
    | "contextual"
    | "opposite"
    | "similar";
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  words: SemanticConnectionWord[];
}

export interface SemanticConnectionWord {
  id: number;
  connectionId: number;
  wordId: number;
  order: number;
  title?: string;
  description?: string;
  createdAt: Date;
  word: Word;
}

export interface CreateSemanticConnectionData {
  title?: string;
  description?: string;
  connectionType:
    | "semantic"
    | "grammatical"
    | "contextual"
    | "opposite"
    | "similar";
  words: {
    wordId: number;
    title?: string;
    description?: string;
  }[];
}

import { browserApi } from "@/lib/api/resources";

import {
  awardPoints,
  rollbackPoints,
  settlePoints,
} from "@/lib/points-optimistic";

export const getVaults = browserApi.getVaults as () => Promise<Vault[]>;
export const createVault = browserApi.createVault as (name: string) => Promise<Vault>;
export const deleteVault = browserApi.deleteVault as (vaultId: number) => Promise<void>;
export const updateVaultName = browserApi.updateVaultName as (
  vaultId: number,
  newName: string
) => Promise<Vault>;
export const exportVaultWords = browserApi.exportVaultWords as (
  vaultId: number
) => Promise<string>;
export const importWordsToVault = browserApi.importWordsToVault as (
  vaultId: number,
  importData: string
) => Promise<{ success: boolean; importedCount: number; errors: string[] }>;
export async function createWord(data: CreateWordData): Promise<Word> {
  const awards = data.isSaved !== false;
  if (awards) awardPoints();
  try {
    const word = (await browserApi.createWord(data)) as Word;
    if (awards) settlePoints();
    return word;
  } catch (error) {
    if (awards) rollbackPoints();
    throw error;
  }
}
export const searchWordInVaults = browserApi.searchWordInVaults as (
  searchTerm: string
) => Promise<SearchResult[]>;
export const wordExistsInVault = browserApi.wordExistsInVault as (
  wordName: string,
  vaultId: number
) => Promise<boolean>;
export const moveWordToVault = browserApi.moveWordToVault as (
  wordId: number,
  newVaultId: number
) => Promise<Word>;
export const unsaveWord = browserApi.unsaveWord as (wordId: number) => Promise<Word>;
export const deleteWord = browserApi.deleteWord as (wordId: number) => Promise<void>;
export const removeWordFromVault = browserApi.removeWordFromVault as (
  wordName: string,
  vaultId: number,
  wordId?: number
) => Promise<void>;
export const updateWord = browserApi.updateWord as (
  wordId: number,
  data: Partial<Word> & {
    origin?: {
      sentence?: string | null;
      sourceTitle?: string | null;
      sourceKind?: "book" | "text" | "manual";
    };
  }
) => Promise<Word>;
export const linkWords = browserApi.linkWords as (
  wordId1: number,
  wordId2: number
) => Promise<void>;
export const unlinkWords = browserApi.unlinkWords as (
  wordId1: number,
  wordId2: number
) => Promise<void>;
export const getRelatedWords = browserApi.getRelatedWords as (
  wordId: number
) => Promise<Word[]>;
export const getLinkableWords = browserApi.getLinkableWords as (
  wordId: number,
  currentVaultId?: number,
  useAllVaultsForLinks?: boolean
) => Promise<Word[]>;
export const getAllWordRelations = browserApi.getAllWordRelations as () => Promise<
  Array<{ wordA: Word; wordB: Word }>
>;
export const checkTextWords = browserApi.checkTextWords as (
  content: string
) => Promise<Array<{ word: string; vaultInfo: Vault[] }>>;
export const resolveSelectionSave = browserApi.resolveSelectionSave as (
  selectedText: string,
  saveType: SelectionSaveType
) => Promise<{
  name: string;
  grammaticalClass: string;
  translations: string[];
  previewLabel: string;
}>;
export const previewPhrasalCanonical = browserApi.previewPhrasalCanonical as (
  selectedText: string
) => Promise<string | null>;
export const incrementWordFrequency = browserApi.incrementWordFrequency as (
  wordId: number
) => Promise<Word>;
export const createText = browserApi.createText as (
  title: string,
  content: string
) => Promise<Text>;
export const getTextById = browserApi.getTextById as (
  textId: number
) => Promise<Text | null>;
export const getUserTexts = browserApi.getUserTexts as () => Promise<Text[]>;
export const getCatalogTexts = browserApi.getCatalogTexts as () => Promise<Text[]>;
export const updateText = browserApi.updateText as (
  textId: number,
  title: string,
  content: string
) => Promise<Text>;
export const deleteText = browserApi.deleteText as (textId: number) => Promise<void>;
export const createSemanticConnection = browserApi.createSemanticConnection as (
  data: CreateSemanticConnectionData
) => Promise<SemanticConnection>;
export const getSemanticConnections =
  browserApi.getSemanticConnections as () => Promise<SemanticConnection[]>;
export const updateSemanticConnection = browserApi.updateSemanticConnection as (
  connectionId: number,
  data: CreateSemanticConnectionData
) => Promise<SemanticConnection>;
export const deleteSemanticConnection = browserApi.deleteSemanticConnection as (
  connectionId: number
) => Promise<void>;

export type RankingPeriod = "week" | "month" | "lifetime";

export type RankingBoard = {
  period: RankingPeriod;
  pointsPerWord: number;
  me: { points: number; rank: number | null };
  entries: Array<{
    rank: number;
    userId: number;
    name: string;
    points: number;
    isMe: boolean;
  }>;
};

export const getRanking = browserApi.getRanking as (
  period: RankingPeriod
) => Promise<RankingBoard>;
