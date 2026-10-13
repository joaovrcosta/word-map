export interface FlashcardWord {
  id: number;
  name: string;
  grammaticalClass: string;
  category: string | null;
  translations: string[];
  confidence: number;
  lastPractice?: Date | null;
  vaultId: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ChallengeKind = "listen" | "match" | "cloze";

export interface FlashcardProgress {
  wordId: number;
  lastReviewed: Date | null;
  nextReview: Date | null;
  reviewCount: number;
  confidence: number;
  streak: number;
  easeFactor: number;
}

export interface FlashcardSession {
  id: string;
  vaultId: number;
  vaultName: string;
  totalWords: number;
  wordsToReview: number;
  newWords: number;
  completedWords: number;
  startTime: Date;
  endTime?: Date;
}

import { browserApi } from "@/lib/api/resources";

export const getFlashcardWords = browserApi.getFlashcardWords as (
  vaultId: number
) => Promise<FlashcardWord[]>;
export const getVaultForFlashcards = browserApi.getVaultForFlashcards as (
  vaultId: number
) => Promise<{ id: number; name: string; totalWords: number; words: FlashcardWord[] }>;
export const updateWordProgress = browserApi.updateWordProgress;
export const recordChallengeResult = browserApi.recordChallengeResult;
export const createFlashcardSession = browserApi.createFlashcardSession;
export const calculateNextReview = browserApi.calculateNextReview;
export const filterWordsForReview = browserApi.filterWordsForReview;
