import { HttpException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  calculateNextReview,
  createFlashcardSession,
  filterWordsForReview,
  getAllFlashcardWords,
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
  REVIEW_MAX_TOKENS,
  REVIEW_SYSTEM_PROMPT,
  buildSessionReview,
  parseReviewActions,
  readReviewCache,
  readReviewItems,
  renderReview,
  reviewCacheKey,
  writeReviewCache,
  type ReviewWord,
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

  const quota = await consumeTutorQuota(user.id);
  if (!quota.allowed) return { clozes: fresh };

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

  const ids = [...new Set(items.map((item) => item.id))];
  const rows = await prisma.word.findMany({
    where: { id: { in: ids }, vault: { userId: user.id } },
    select: { id: true, name: true, translations: true },
  });
  const words = new Map<number, ReviewWord>(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        name: row.name,
        translation: row.translations.find((item) => item.trim())?.trim() ?? "",
      },
    ])
  );
  const review = buildSessionReview(items, words);
  if (!review.shouldCallModel) return { text: review.text };

  const key = reviewCacheKey(user.id, review.normalized);
  const cached = readReviewCache(key);
  if (cached) return { text: cached };

  const quota = await consumeTutorQuota(user.id);
  if (!quota.allowed) return { text: review.text };

  try {
    const result = await createOpenAITutor().completeJson(
      review.userPrompt,
      REVIEW_MAX_TOKENS,
      REVIEW_SYSTEM_PROMPT
    );
    if (result.blocked || result.truncated || !result.text) {
      await refundTutorQuota(user.id);
      writeReviewCache(key, review.text);
      return { text: review.text };
    }
    const actions = parseReviewActions(result.text, review.allowedIds);
    if (!actions) {
      await refundTutorQuota(user.id);
      writeReviewCache(key, review.text);
      return { text: review.text };
    }
    const text = renderReview(review, actions);
    writeReviewCache(key, text);
    return { text };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    console.error("Falha ao analisar sessão:", error);
    await refundTutorQuota(user.id);
    writeReviewCache(key, review.text);
    return { text: review.text };
  }
}

@Injectable()
export class FlashcardsService {
  constructor(private readonly flashcards: FlashcardsRepository) {}

  words(vaultId: number) {
    return getFlashcardWords(vaultId);
  }

  allWords() {
    return getAllFlashcardWords();
  }

  vault(vaultId: number) {
    return getVaultForFlashcards(vaultId);
  }

  progress(wordId: number, confidence: number, reviewCount: number) {
    return updateWordProgress(wordId, confidence, reviewCount);
  }

  result(wordId: number, correct: boolean, challenge: ChallengeKind, streak?: number) {
    return recordChallengeResult(wordId, correct, challenge, streak);
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
