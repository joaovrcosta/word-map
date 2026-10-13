import type { Word } from "@/actions/actions";

export interface Sentence {
  id: number;
  title?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  words: SentenceWord[];
}

export interface SentenceWord {
  id: number;
  sentenceId: number;
  wordId: number;
  position: number;
  highlightColor?: string;
  createdAt: Date;
  word: Word;
}

export interface CreateSentenceData {
  title?: string;
  notes?: string;
  words: {
    wordId?: number;
    wordData?: {
      name: string;
      grammaticalClass: string;
      translations: string[];
      category?: string | null;
    };
    position: number;
    highlightColor?: string;
  }[];
}

import { browserApi } from "@/lib/api/resources";

export const createSentence = browserApi.createSentence;
export const getUserSentences = browserApi.getUserSentences as () => Promise<Sentence[]>;
export const getSentenceById = browserApi.getSentenceById as (
  sentenceId: number
) => Promise<Sentence | null>;
export const updateSentence = browserApi.updateSentence;
export const deleteSentence = browserApi.deleteSentence;
export const getWordsForSentenceBuilder =
  browserApi.getWordsForSentenceBuilder as () => Promise<Word[]>;
