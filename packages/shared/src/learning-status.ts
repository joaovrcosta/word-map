import type { LearningStatusId } from "./fsrs-schedule";
import { resolveLearningStatusFromWord } from "./fsrs-schedule";

export type LearningStatusMeta = {
  id: LearningStatusId;
  label: string;
  description: string;
  color: string;
  /** Cor mais clara para o estado selecionado/ativo. */
  activeColor: string;
  icon: "star" | "ellipse" | "refresh" | "checkmark-circle";
};

export const LEARNING_STATUS_META: Record<LearningStatusId, LearningStatusMeta> = {
  new: {
    id: "new",
    label: "NEW",
    description: "Ainda não foi vista.",
    color: "#3A3A3C",
    activeColor: "#6B6B70",
    icon: "star",
  },
  learning: {
    id: "learning",
    label: "LEARNING",
    description: "Precisa ser vista com frequência.",
    color: "#882D60",
    activeColor: "#E05A9A",
    icon: "ellipse",
  },
  relearning: {
    id: "relearning",
    label: "RELEARNING",
    description: "Você aprendeu, mas esqueceu.",
    color: "#6A4C93",
    activeColor: "#B07AE0",
    icon: "ellipse",
  },
  reviewing: {
    id: "reviewing",
    label: "REVIEWING",
    description: "Aprendida, mas precisa de reforço.",
    color: "#1967D2",
    activeColor: "#4B9BFF",
    icon: "refresh",
  },
  confident: {
    id: "confident",
    label: "CONFIDENT",
    description: "Você lembra de forma consistente.",
    color: "#1E6B45",
    activeColor: "#24C875",
    icon: "checkmark-circle",
  },
};

export const LEARNING_STATUS_ORDER: LearningStatusId[] = [
  "new",
  "learning",
  "relearning",
  "reviewing",
  "confident",
];

export function learningStatusMetaForWord(word: {
  fsrsState?: number | null;
  stability?: number | null;
  dueAt?: Date | string | null;
  lastPractice?: Date | string | null;
  lastReview?: Date | string | null;
  confidence?: number;
}): LearningStatusMeta {
  return LEARNING_STATUS_META[resolveLearningStatusFromWord(word)];
}

export function learningStatusMeta(id: LearningStatusId): LearningStatusMeta {
  return LEARNING_STATUS_META[id];
}
