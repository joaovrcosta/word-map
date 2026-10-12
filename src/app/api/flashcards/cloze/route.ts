import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/auth";
import { prisma } from "@/lib/prisma";
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
} from "@/lib/cloze";
import { createOpenAITutor } from "@/lib/tutor";
import { consumeTutorQuota, refundTutorQuota } from "@/lib/tutor-quota";

type OwnedWord = {
  id: number;
  name: string;
  translations: string[];
  clozes: Array<{
    cacheKey: string;
    sentence: string;
    answer: string;
  }>;
};

function readWordIds(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > CLOZE_BATCH_LIMIT) return null;
  const ids: number[] = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isInteger(item) || item <= 0) {
      return null;
    }
    ids.push(item);
  }
  return [...new Set(ids)];
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { wordIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Lista inválida" }, { status: 400 });
  }

  const wordIds = readWordIds(body.wordIds);
  if (!wordIds) {
    return NextResponse.json({ error: "Lista inválida" }, { status: 400 });
  }
  if (wordIds.length === 0) {
    return NextResponse.json({ clozes: [] });
  }

  const words = (await prisma.word.findMany({
    where: {
      id: { in: wordIds },
      vault: { userId: user.id },
    },
    select: {
      id: true,
      name: true,
      translations: true,
      clozes: {
        where: { variant: CLOZE_VARIANT },
        select: { cacheKey: true, sentence: true, answer: true },
      },
    },
  })) as OwnedWord[];

  if (words.length !== wordIds.length) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

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

  if (missing.length === 0) {
    return NextResponse.json({ clozes: fresh });
  }

  const allowed = await consumeTutorQuota(user.id);
  if (!allowed) {
    return NextResponse.json({ clozes: fresh });
  }

  let raw = "";
  try {
    const result = await createOpenAITutor().completeJson(
      buildClozePrompt(missing)
    );
    if (result.blocked || result.truncated || !result.text) {
      return NextResponse.json({ clozes: fresh });
    }
    raw = result.text;
  } catch (error) {
    console.error("Falha ao gerar frases:", error);
    await refundTutorQuota(user.id);
    return NextResponse.json({ clozes: fresh });
  }

  const parsed = parseClozeResponse(raw);
  if (!parsed.ok) {
    return NextResponse.json({ clozes: fresh });
  }

  const byId = new Map(missing.map((word) => [word.id, word]));
  const saved = [...fresh];

  for (const item of parsed.items) {
    const word = byId.get(item.wordId);
    if (!word) continue;
    if (!acceptClozeSentence(item.sentence, word.name)) continue;
    const cacheKey = clozeCacheKey(word.name, word.translation);
    await prisma.wordCloze.upsert({
      where: {
        wordId_variant: { wordId: word.id, variant: CLOZE_VARIANT },
      },
      create: {
        wordId: word.id,
        variant: CLOZE_VARIANT,
        sentence: item.sentence,
        answer: word.name,
        cacheKey,
      },
      update: {
        sentence: item.sentence,
        answer: word.name,
        cacheKey,
      },
    });
    saved.push({
      wordId: word.id,
      sentence: item.sentence,
      answer: word.name,
    });
  }

  return NextResponse.json({ clozes: saved });
}
