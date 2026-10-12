import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/auth";
import { prisma } from "@/lib/prisma";
import {
  MAX_SUGGEST_SENTENCE,
  MAX_SUGGEST_WORD,
  buildSuggestTranslationPrompt,
  parseSuggestTranslation,
} from "@/lib/suggest-translation";
import { createOpenAITutor } from "@/lib/tutor";
import { consumeTutorQuota, refundTutorQuota } from "@/lib/tutor-quota";

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

  let body: { word?: unknown; sentence?: unknown; wordId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Palavra inválida" }, { status: 400 });
  }

  let word = readField(body.word, MAX_SUGGEST_WORD);
  if (!word) {
    return NextResponse.json({ error: "Palavra inválida" }, { status: 400 });
  }

  let sentence: string | null = null;
  if (body.sentence != null && body.sentence !== "") {
    sentence = readField(body.sentence, MAX_SUGGEST_SENTENCE);
    if (!sentence) {
      return NextResponse.json({ error: "Palavra inválida" }, { status: 400 });
    }
  }

  if (typeof body.wordId === "number") {
    if (!Number.isInteger(body.wordId) || body.wordId <= 0) {
      return NextResponse.json({ error: "Palavra inválida" }, { status: 400 });
    }
    const owned = await prisma.word.findFirst({
      where: { id: body.wordId, vault: { userId: user.id } },
      select: { name: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }
    word = owned.name.trim();
  }

  const allowed = await consumeTutorQuota(user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Muitas sugestões em pouco tempo." },
      { status: 429 }
    );
  }

  try {
    const result = await createOpenAITutor().completeJson(
      buildSuggestTranslationPrompt({ word, sentence }),
      120
    );
    const parsed = parseSuggestTranslation(result.text, word, result.blocked);
    if (!parsed.ok || result.truncated) {
      return NextResponse.json(
        { error: "Não foi possível sugerir uma tradução." },
        { status: 502 }
      );
    }
    return NextResponse.json({ translation: parsed.translation });
  } catch (error) {
    console.error("Falha ao sugerir tradução:", error);
    await refundTutorQuota(user.id);
    return NextResponse.json(
      { error: "Sugestão indisponível" },
      { status: 502 }
    );
  }
}
