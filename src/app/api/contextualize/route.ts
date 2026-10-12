import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/auth";
import { prisma } from "@/lib/prisma";
import { writePassageExplanation } from "@/lib/passage-explanation";
import { consumeTutorQuota } from "@/lib/tutor-quota";
import {
  PROMPT_VERSION,
  TUTOR_MODEL,
  buildTutorPrompt,
  createOpenAITutor,
  explanationCacheKey,
  parseTutorContext,
} from "@/lib/tutor";

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

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: {
    span?: unknown;
    sentence?: unknown;
    paragraph?: unknown;
    previousParagraph?: unknown;
    wordId?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Trecho inválido" }, { status: 400 });
  }

  const span = readField(body.span, FIELD_LIMITS.span);
  const sentence = readField(body.sentence, FIELD_LIMITS.sentence);
  const paragraph = readField(body.paragraph, FIELD_LIMITS.paragraph);
  if (!span || !sentence || !paragraph) {
    return NextResponse.json({ error: "Trecho inválido" }, { status: 400 });
  }

  let previousParagraph: string | null = null;
  if (body.previousParagraph != null && body.previousParagraph !== "") {
    previousParagraph = readField(body.previousParagraph, FIELD_LIMITS.previous);
    if (!previousParagraph) {
      return NextResponse.json({ error: "Trecho inválido" }, { status: 400 });
    }
  }

  const cacheKey = explanationCacheKey({
    promptVersion: PROMPT_VERSION,
    model: TUTOR_MODEL,
    span,
    sentence,
  });

  const wordId = typeof body.wordId === "number" ? body.wordId : null;

  const cached = await prisma.readingExplanation.findUnique({
    where: { cacheKey },
  });
  if (cached) {
    await rememberPassage(
      user.id,
      span,
      sentence,
      cached.explanation,
      cached.translation,
      wordId
    );
    return NextResponse.json({
      explanation: cached.explanation,
      translation: cached.translation,
      cached: true,
    });
  }

  const allowed = await consumeTutorQuota(user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Muitas explicações em pouco tempo." },
      { status: 429 }
    );
  }

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
      return NextResponse.json(
        { error: "Não foi possível explicar este trecho." },
        { status: 502 }
      );
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

    return NextResponse.json({
      explanation: saved.explanation,
      translation: saved.translation,
      cached: false,
    });
  } catch (error) {
    console.error("Falha ao contextualizar:", error);
    return NextResponse.json(
      { error: "Explicação indisponível" },
      { status: 502 }
    );
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
