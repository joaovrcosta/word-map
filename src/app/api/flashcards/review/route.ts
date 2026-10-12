import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/auth";
import {
  buildReviewPrompt,
  parseReviewResponse,
  readReviewItems,
} from "@/lib/flashcard-review";
import { createOpenAITutor } from "@/lib/tutor";
import { consumeTutorQuota, refundTutorQuota } from "@/lib/tutor-quota";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { items?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Lista inválida" }, { status: 400 });
  }

  const items = readReviewItems(body.items);
  if (!items) {
    return NextResponse.json({ error: "Lista inválida" }, { status: 400 });
  }

  const allowed = await consumeTutorQuota(user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Muitas explicações em pouco tempo." },
      { status: 429 }
    );
  }

  try {
    const result = await createOpenAITutor().completeJson(
      buildReviewPrompt(items),
      400
    );
    if (result.blocked || result.truncated || !result.text) {
      return NextResponse.json(
        { error: "Não foi possível analisar a sessão." },
        { status: 502 }
      );
    }
    const parsed = parseReviewResponse(result.text);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: "Não foi possível analisar a sessão." },
        { status: 502 }
      );
    }
    return NextResponse.json({ text: parsed.text });
  } catch (error) {
    console.error("Falha ao analisar sessão:", error);
    await refundTutorQuota(user.id);
    return NextResponse.json(
      { error: "Não foi possível analisar a sessão." },
      { status: 502 }
    );
  }
}
