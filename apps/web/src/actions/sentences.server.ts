import "server-only";
import { serverApi } from "@/lib/api/server";
export type { Sentence, CreateSentenceData } from "./sentences";

export const createSentence = serverApi.createSentence;
export const getUserSentences = serverApi.getUserSentences;
export const getSentenceById = serverApi.getSentenceById;
export const updateSentence = serverApi.updateSentence;
export const deleteSentence = serverApi.deleteSentence;
export const getWordsForSentenceBuilder = serverApi.getWordsForSentenceBuilder;
