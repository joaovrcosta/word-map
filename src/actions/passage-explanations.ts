"use server";

import { getCurrentUser } from "@/actions/auth";
import { readPassageExplanation } from "@/lib/passage-explanation";

export async function getPassageExplanation(
  span: string,
  sentence: string
): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || !span.trim() || !sentence.trim()) return null;
  return readPassageExplanation(user.id, span, sentence);
}
