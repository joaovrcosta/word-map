import "server-only";
import { serverApi } from "@/lib/api/server";
export type { FlashcardWord, FlashcardSession, ChallengeKind } from "./flashcards";

export const getFlashcardWords = serverApi.getFlashcardWords;
export const getVaultForFlashcards = serverApi.getVaultForFlashcards;
export const updateWordProgress = serverApi.updateWordProgress;
export const recordChallengeResult = serverApi.recordChallengeResult;
export const createFlashcardSession = serverApi.createFlashcardSession;
export const calculateNextReview = serverApi.calculateNextReview;
export const filterWordsForReview = serverApi.filterWordsForReview;
