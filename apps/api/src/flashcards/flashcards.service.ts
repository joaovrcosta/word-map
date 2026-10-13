import { HttpException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  calculateNextReview,
  createFlashcardSession,
  filterWordsForReview,
  getFlashcardWords,
  getVaultForFlashcards,
  recordChallengeResult,
  updateWordProgress,
  type ChallengeKind,
  type FlashcardWord,
} from "../domain/flashcards";
import { prisma } from "../prisma/client";
import { getCurrentUser } from "../auth/current-user";
import {
  CLOZE_BATCH_LIMIT,
  CLOZE_VARIANT,
  acceptClozeSentence,
  buildClozePrompt,
  clozeCacheKey,
  clozeIsFresh,
  isSingleWordName,
  parseClozeResponse,
  primaryTranslation,
} from "../lib/cloze";
import {
  buildReviewPrompt,
  parseReviewResponse,
  readReviewItems,
} from "../lib/flashcard-review";
import { createOpenAITutor } from "../lib/tutor";
import { consumeTutorQuota, refundTutorQuota } from "../lib/tutor-quota";

@Injectable()
export class FlashcardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findWords(userId: number, vaultId: number) {
    return this.prisma.word.findMany({
      where: { vaultId, vault: { userId } },
    });
  }
}

function fail(status: number, error: string): never {
  throw new HttpException({ error }, status);
}

export async function generateClozes(wordIdsInput: unknown) {
  const user = await getCurrentUser();
  if (!user) fail(401, "Não autorizado");

  if (!Array.isArray(wordIdsInput) || wordIdsInput.length > CLOZE_BATCH_LIMIT) {
    fail(400, "Lista inválida");
  }
  const wordIds: number[] = [];
  for (const item of wordIdsInput) {
    if (typeof item !== "number" || !Number.isInteger(item) || item <= 0) {
      fail(400, "Lista inválida");
    }
    wordIds.push(item);
  }
  const unique = [...new Set(wordIds)];
  if (unique.length === 0) return { clozes: [] };

  const words = await prisma.word.findMany({
    where: { id: { in: unique }, vault: { userId: user.id } },
    select: {
      id: true,
      name: true,
      translations: true,
      clozes: {
        where: { variant: CLOZE_VARIANT },
        select: { cacheKey: true, sentence: true, answer: true },
      },
    },
  });

  if (words.length !== unique.length) fail(403, "Não autorizado");

  const fresh: Array<{ wordId: number; sentence: string; answer: string }> = [];
  const missing: Array<{ id: number; name: string; translation: string }> = [];

  for (const word of words) {
    if (!isSingleWordName(word.name)) continue;
    const translation = primaryTranslation(word.translations);
    const cacheKey = clozeCacheKey(word.name, translation);
    const stored = word.clozes[0];
    if (clozeIsFresh(stored, cacheKey) && stored) {
      fresh.push({
        wordId: word.id,
        sentence: stored.sentence,
        answer: stored.answer,
      });
      continue;
    }
    missing.push({ id: word.id, name: word.name, translation });
  }

  if (missing.length === 0) return { clozes: fresh };

  const allowed = await consumeTutorQuota(user.id);
  if (!allowed) return { clozes: fresh };

  let raw = "";
  try {
    const result = await createOpenAITutor().completeJson(buildClozePrompt(missing));
    if (result.blocked || result.truncated || !result.text) return { clozes: fresh };
    raw = result.text;
  } catch (error) {
    console.error("Falha ao gerar frases:", error);
    await refundTutorQuota(user.id);
    return { clozes: fresh };
  }

  const parsed = parseClozeResponse(raw);
  if (!parsed.ok) return { clozes: fresh };

  const byId = new Map(missing.map((word) => [word.id, word]));
  const saved = [...fresh];
  for (const item of parsed.items) {
    const word = byId.get(item.wordId);
    if (!word || !acceptClozeSentence(item.sentence, word.name)) continue;
    const cacheKey = clozeCacheKey(word.name, word.translation);
    await prisma.wordCloze.upsert({
      where: { wordId_variant: { wordId: word.id, variant: CLOZE_VARIANT } },
      create: {
        wordId: word.id,
        variant: CLOZE_VARIANT,
        sentence: item.sentence,
        answer: word.name,
        cacheKey,
      },
      update: { sentence: item.sentence, answer: word.name, cacheKey },
    });
    saved.push({ wordId: word.id, sentence: item.sentence, answer: word.name });
  }

  return { clozes: saved };
}

export async function reviewSession(itemsInput: unknown) {
  const user = await getCurrentUser();
  if (!user) fail(401, "Não autorizado");
  const items = readReviewItems(itemsInput);
  if (!items) fail(400, "Lista inválida");

  const allowed = await consumeTutorQuota(user.id);
  if (!allowed) fail(429, "Muitas explicações em pouco tempo.");

  try {
    const result = await createOpenAITutor().completeJson(buildReviewPrompt(items), 400);
    if (result.blocked || result.truncated || !result.text) {
      fail(502, "Não foi possível analisar a sessão.");
    }
    const parsed = parseReviewResponse(result.text);
    if (!parsed.ok) fail(502, "Não foi possível analisar a sessão.");
    return { text: parsed.text };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    console.error("Falha ao analisar sessão:", error);
    await refundTutorQuota(user.id);
    fail(502, "Não foi possível analisar a sessão.");
  }
}

@Injectable()
export class FlashcardsService {
  constructor(private readonly flashcards: FlashcardsRepository) {}

  words(vaultId: number) {
    return getFlashcardWords(vaultId);
  }

  vault(vaultId: number) {
    return getVaultForFlashcards(vaultId);
  }

  progress(wordId: number, confidence: number, reviewCount: number) {
    return updateWordProgress(wordId, confidence, reviewCount);
  }

  result(wordId: number, correct: boolean, challenge: ChallengeKind) {
    return recordChallengeResult(wordId, correct, challenge);
  }

  session(vaultId: number) {
    return createFlashcardSession(vaultId);
  }

  nextReview(currentConfidence: number, reviewCount: number, easeFactor?: number) {
    return calculateNextReview(currentConfidence, reviewCount, easeFactor);
  }

  filter(words: FlashcardWord[]) {
    return filterWordsForReview(words);
  }

  clozes(wordIds: unknown) {
    return generateClozes(wordIds);
  }

  review(items: unknown) {
    return reviewSession(items);
  }
}
