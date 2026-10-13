
import { getCurrentUser } from "../auth/current-user";
import {
  readPassageExplanation,
  type SavedPassage,
} from "../lib/passage-explanation";

export async function getPassageExplanation(
  span: string,
  sentence: string
): Promise<SavedPassage | null> {
  const user = await getCurrentUser();
  if (!user || !span.trim() || !sentence.trim()) return null;
  return readPassageExplanation(user.id, span, sentence);
}
