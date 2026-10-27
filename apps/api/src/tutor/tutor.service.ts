import { HttpException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { prisma } from "../prisma/client";
import { getCurrentUser } from "../auth/current-user";
import { getPassageExplanation } from "../domain/passage-explanations";
import { writePassageExplanation } from "../lib/passage-explanation";
import { consumeTutorQuota, refundTutorQuota } from "../lib/tutor-quota";
import {
  PROMPT_VERSION,
  TUTOR_MODEL,
  buildTutorPrompt,
  createOpenAITutor,
  explanationCacheKey,
  parseTutorContext,
} from "../lib/tutor";
import {
  MAX_SUGGEST_SENTENCE,
  MAX_SUGGEST_WORD,
  buildSuggestTranslationPrompt,
  parseSuggestTranslation,
} from "../lib/suggest-translation";
import {
  FOLLOW_UP_MAX_TOKENS,
  buildFollowUpPrompt,
  parseFollowUpAnswer,
} from "../lib/tutor-follow-up";
import {
  MAX_FOLLOW_UPS_PER_EXPLANATION,
  MAX_FOLLOW_UP_ANSWER,
  MAX_FOLLOW_UP_EXPLANATION,
  MAX_FOLLOW_UP_QUESTION,
  MAX_FOLLOW_UP_SENTENCE,
  MAX_FOLLOW_UP_SPAN,
  type TutorFollowUpTurn,
} from "@word-map/shared";

const FIELD_LIMITS = {
  span: 200,
  sentence: 2000,
  paragraph: 4000,
  previous: 4000,
} as const;

function readField(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

function readFollowUpTurns(value: unknown): TutorFollowUpTurn[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  if (value.length > MAX_FOLLOW_UPS_PER_EXPLANATION) return null;
  const turns: TutorFollowUpTurn[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const row = item as { question?: unknown; answer?: unknown };
    const question = readField(row.question, MAX_FOLLOW_UP_QUESTION);
    const answer = readField(row.answer, MAX_FOLLOW_UP_ANSWER);
    if (!question || !answer) return null;
    turns.push({ question, answer });
  }
  return turns;
}

function fail(status: number, error: string): never {
  throw new HttpException({ error }, status);
}

function failTutorQuota(window: "minute" | "day"): never {
  const error =
    window === "day"
      ? "Limite diário de explicações atingido."
      : "Muitas explicações em pouco tempo.";
  throw new HttpException({ error, code: "TUTOR_QUOTA", window }, 429);
}

@Injectable()
export class TutorRepository {
  constructor(private readonly prisma: PrismaService) {}

  findExplanation(cacheKey: string) {
    return this.prisma.readingExplanation.findUnique({ where: { cacheKey } });
  }
}

async function rememberPassage(
  userId: number,
  span: string,
  sentence: string,
  explanation: string,
  translation: string | null,
  wordId: number | null
) {
  try {
    await writePassageExplanation({
      userId,
      span,
      sentence,
      explanation,
      translation,
      wordId,
    });
  } catch (error) {
    console.error("Falha ao salvar explicação na palavra:", error);
  }
}

async function explainWithRetry(prompt: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await createOpenAITutor().completeJson(prompt, 700);
    } catch (error) {
      lastError = error;
      const unavailable =
        error instanceof Error && error.name === "TutorUnavailable";
      if (!unavailable || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  throw lastError;
}

@Injectable()
export class TutorService {
  constructor(private readonly tutor: TutorRepository) {}

  passage(span: string, sentence: string) {
    return getPassageExplanation(span, sentence);
  }

  async contextualize(body: {
    span?: unknown;
    sentence?: unknown;
    paragraph?: unknown;
    previousParagraph?: unknown;
    wordId?: unknown;
  }) {
    const user = await getCurrentUser();
    if (!user) fail(401, "Não autorizado");

    const span = readField(body.span, FIELD_LIMITS.span);
    const sentence = readField(body.sentence, FIELD_LIMITS.sentence);
    const paragraph = readField(body.paragraph, FIELD_LIMITS.paragraph);
    if (!span || !sentence || !paragraph) fail(400, "Trecho inválido");

    let previousParagraph: string | null = null;
    if (body.previousParagraph != null && body.previousParagraph !== "") {
      previousParagraph = readField(body.previousParagraph, FIELD_LIMITS.previous);
      if (!previousParagraph) fail(400, "Trecho inválido");
    }

    const cacheKey = explanationCacheKey({
      promptVersion: PROMPT_VERSION,
      model: TUTOR_MODEL,
      span,
      sentence,
    });
    const wordId = typeof body.wordId === "number" ? body.wordId : null;
    const cached = await prisma.readingExplanation.findUnique({ where: { cacheKey } });
    if (cached) {
      await rememberPassage(
        user.id,
        span,
        sentence,
        cached.explanation,
        cached.translation,
        wordId
      );
      return {
        explanation: cached.explanation,
        translation: cached.translation,
        cached: true,
      };
    }

    const quota = await consumeTutorQuota(user.id);
    if (!quota.allowed) failTutorQuota(quota.window);

    try {
      const prompt = buildTutorPrompt({
        span,
        sentence,
        paragraph,
        previousParagraph,
      });
      const result = await explainWithRetry(prompt);
      const parsed = parseTutorContext(result.text, result.blocked);
      if (!parsed.ok || result.truncated) {
        fail(502, "Não foi possível explicar este trecho.");
      }

      const saved = await prisma.readingExplanation.upsert({
        where: { cacheKey },
        create: {
          cacheKey,
          promptVersion: PROMPT_VERSION,
          model: TUTOR_MODEL,
          explanation: parsed.explanation,
          translation: parsed.translation,
        },
        update: {
          promptVersion: PROMPT_VERSION,
          model: TUTOR_MODEL,
          explanation: parsed.explanation,
          translation: parsed.translation,
        },
      });

      await rememberPassage(
        user.id,
        span,
        sentence,
        saved.explanation,
        saved.translation,
        wordId
      );
      return {
        explanation: saved.explanation,
        translation: saved.translation,
        cached: false,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Falha ao contextualizar:", error);
      fail(502, "Explicação indisponível");
    }
  }

  async followUp(body: {
    span?: unknown;
    sentence?: unknown;
    explanation?: unknown;
    question?: unknown;
    previousTurns?: unknown;
  }) {
    const user = await getCurrentUser();
    if (!user) fail(401, "Não autorizado");

    const span = readField(body.span, MAX_FOLLOW_UP_SPAN);
    const sentence = readField(body.sentence, MAX_FOLLOW_UP_SENTENCE);
    const explanation = readField(body.explanation, MAX_FOLLOW_UP_EXPLANATION);
    const question = readField(body.question, MAX_FOLLOW_UP_QUESTION);
    if (!span || !sentence || !explanation || !question) {
      fail(400, "Pergunta inválida");
    }

    const previousTurns = readFollowUpTurns(body.previousTurns);
    if (previousTurns === null) fail(400, "Pergunta inválida");
    if (previousTurns.length >= MAX_FOLLOW_UPS_PER_EXPLANATION) {
      fail(400, "Limite de perguntas nesta explicação");
    }

    const quota = await consumeTutorQuota(user.id);
    if (!quota.allowed) failTutorQuota(quota.window);

    try {
      const result = await createOpenAITutor().completeJson(
        buildFollowUpPrompt({
          span,
          sentence,
          explanation,
          question,
          previousTurns,
        }),
        FOLLOW_UP_MAX_TOKENS
      );
      const parsed = parseFollowUpAnswer(result.text, result.blocked);
      if (!parsed.ok || result.truncated) {
        await refundTutorQuota(user.id);
        fail(502, "Não foi possível responder esta dúvida.");
      }
      return { answer: parsed.answer };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Falha no follow-up do tutor:", error);
      await refundTutorQuota(user.id);
      fail(502, "Resposta indisponível");
    }
  }

  async suggest(body: { word?: unknown; sentence?: unknown; wordId?: unknown }) {
    const user = await getCurrentUser();
    if (!user) fail(401, "Não autorizado");

    let word = readField(body.word, MAX_SUGGEST_WORD);
    if (!word) fail(400, "Palavra inválida");

    // Frases literárias costumam passar do limite — corta em vez de rejeitar a palavra.
    let sentence: string | null = null;
    if (typeof body.sentence === "string") {
      const trimmed = body.sentence.trim();
      if (trimmed) sentence = trimmed.slice(0, MAX_SUGGEST_SENTENCE);
    }

    if (typeof body.wordId === "number") {
      if (!Number.isInteger(body.wordId) || body.wordId <= 0) {
        fail(400, "Palavra inválida");
      }
      const owned = await prisma.word.findFirst({
        where: { id: body.wordId, vault: { userId: user.id } },
        select: { name: true },
      });
      if (!owned) fail(403, "Não autorizado");
      word = owned.name.trim();
    }

    const quota = await consumeTutorQuota(user.id);
    if (!quota.allowed) failTutorQuota(quota.window);

    try {
      const result = await createOpenAITutor().completeJson(
        buildSuggestTranslationPrompt({ word, sentence }),
        120
      );
      const parsed = parseSuggestTranslation(result.text, word, result.blocked);
      if (!parsed.ok || result.truncated) {
        fail(502, "Não foi possível sugerir uma tradução.");
      }
      return { translation: parsed.translation };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Falha ao sugerir tradução:", error);
      await refundTutorQuota(user.id);
      fail(502, "Sugestão indisponível");
    }
  }
}
