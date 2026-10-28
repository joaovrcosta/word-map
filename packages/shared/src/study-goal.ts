export const STUDY_GOAL_PRESETS = [5, 10, 15, 20] as const;
export type StudyGoalMinutes = (typeof STUDY_GOAL_PRESETS)[number];
export const DEFAULT_STUDY_GOAL_MINUTES: StudyGoalMinutes = 5;

export const STUDY_HEARTBEAT_MAX_SECONDS = 30;
export const STUDY_CREDIT_WINDOW_MS = 35_000;
export const STUDY_IDLE_MS = 60_000;
export const STUDY_HEARTBEAT_INTERVAL_MS = 15_000;

export type StudyKind = "reading" | "practice";

export function isStudyGoalMinutes(value: unknown): value is StudyGoalMinutes {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    (STUDY_GOAL_PRESETS as readonly number[]).includes(value)
  );
}

export function isStudyKind(value: unknown): value is StudyKind {
  return value === "reading" || value === "practice";
}
