export type StoryListItem = {
  id: number;
  title: string;
  theme: string;
  stepCount: number;
  challengeCount: number;
  completion: { correctCount: number; challengeCount: number; points: number } | null;
};

export type StoryOption = {
  id: number;
  text: string;
};

export type StoryChallenge = {
  id: number;
  kind: "TRUE_FALSE" | "CHOICE";
  prompt: string;
  pickCount?: number;
  options: StoryOption[];
};

export type StoryStep = {
  id: number;
  order: number;
  speaker: string | null;
  text: string;
  translation: string;
  challenge: StoryChallenge | null;
};

export type StoryDetail = {
  id: number;
  title: string;
  theme: string;
  bookTitle: string | null;
  completion: { correctCount: number; challengeCount: number; points: number } | null;
  steps: StoryStep[];
};

export type StoryAnswer = {
  correct: boolean;
  correctValue?: boolean;
  correctOptionIds?: number[];
};

export type StoryCompletion = {
  correctCount: number;
  challengeCount: number;
  points: number;
  awarded: boolean;
};
