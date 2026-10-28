export type StudyWeekDay = {
  day: string;
  label: string;
  completed: boolean;
  isToday: boolean;
};

export type StudyToday = {
  day: string;
  goalMinutes: number;
  seconds: number;
  readingSeconds: number;
  practiceSeconds: number;
  completed: boolean;
  currentStreak: number;
  bestStreak: number;
  remainingSeconds: number;
  atRisk: boolean;
  week: StudyWeekDay[];
};

export type StudyKind = "reading" | "practice";

export function studyMinutesLabel(seconds: number) {
  return Math.floor(seconds / 60);
}
