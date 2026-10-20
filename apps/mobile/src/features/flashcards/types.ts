export type ChallengeKind = "listen" | "match" | "cloze";

export type PendingSave =
  | { kind: "progress"; wordId: number; confidence: number }
  | { kind: "result"; wordId: number; correct: boolean; challenge: ChallengeKind };

export type ReviewKind = "recall" | ChallengeKind;

export type ReviewItem = {
  id: number;
  kind: ReviewKind;
  result: string;
  typed?: string;
};

export type LevelShift = {
  id: number;
  name: string;
  from: number;
  to: number;
};

export type StudySession = {
  vaultName: string;
  completedWords: number;
  startTime: Date;
  endTime: Date | null;
};

export type RawWord = {
  id: number;
  name: string;
  grammaticalClass: string;
  category: string | null;
  translations: string[];
  confidence: number;
  lastPractice?: string | null;
  missedLast?: boolean;
  vaultId: number;
  createdAt: string;
  updatedAt: string;
};

export const LESSON_KINDS = ["recall", "listen", "match", "cloze"] as const;
export type LessonKind = (typeof LESSON_KINDS)[number];

export type WordFocus = { id: number; kinds: LessonKind[] };
export type PracticeMark = { id: number; kind: LessonKind; result: string };
