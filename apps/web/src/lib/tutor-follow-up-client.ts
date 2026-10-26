import {
  MAX_FOLLOW_UP_SENTENCE,
  type TutorFollowUpRequest,
  type TutorFollowUpResponse,
} from "@word-map/shared";
import { apiBase } from "@/lib/api/http";

export async function requestTutorFollowUp(
  payload: TutorFollowUpRequest
): Promise<string> {
  const response = await fetch(`${apiBase()}/tutor/follow-up`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      span: payload.span,
      sentence: payload.sentence.slice(0, MAX_FOLLOW_UP_SENTENCE),
      explanation: payload.explanation,
      question: payload.question,
      previousTurns: payload.previousTurns ?? [],
    }),
  });
  const data = (await response.json()) as TutorFollowUpResponse & {
    error?: string;
  };
  if (!response.ok || !data.answer?.trim()) {
    throw new Error(data.error || "Não foi possível responder esta dúvida.");
  }
  return data.answer.trim();
}
