/**
 * FSRS scheduling wrapper (ts-fsrs 5.4.2).
 *
 * Production uses enable_fuzz: true, so dueAt after a review is NOT reproducible
 * from the review log alone. Future weight training must use reviewedAt + rating
 * (and the pre-review snapshot), never the fuzzed dueAt.
 *
 * enable_short_term: false — New + Again/Good graduates straight to Review;
 * Learning mostly appears via migration/preset, not the natural path.
 */
import {
  type Card,
  type Grade,
  type RecordLogItem,
  Rating,
  State,
  createEmptyCard,
  fsrs,
  generatorParameters,
} from "ts-fsrs";
import { reviewIntervalDays } from "./flashcard-schedule";

export { Rating, State };
export type { Card };

export const CONFIDENT_STABILITY = 21;
export const MIGRATE_CONFIDENT_STABILITY = 25;

export type LearningStatusId = "new" | "learning" | "relearning" | "reviewing" | "confident";

export type FsrsCardFields = {
  fsrsState: number;
  stability: number | null;
  difficulty: number | null;
  dueAt: Date | null;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReview: Date | null;
};

export type FsrsWordPatch = FsrsCardFields & {
  confidence: number;
  lastPractice: Date | null;
};

export type ApplyFsrsResult = {
  card: Card;
  log: RecordLogItem["log"];
  patch: FsrsWordPatch;
  rating: Grade;
};

const DAY_MS = 86_400_000;

function createScheduler(enableFuzz: boolean) {
  return fsrs(
    generatorParameters({
      request_retention: 0.9,
      maximum_interval: 36500,
      enable_fuzz: enableFuzz,
      enable_short_term: false,
    })
  );
}

/** Production scheduler (fuzz on). */
export const fsrsScheduler = createScheduler(true);

/** Deterministic scheduler for unit tests (fuzz off). */
export const fsrsSchedulerForTests = createScheduler(false);

export function emptyFsrsCard(now: Date = new Date()): Card {
  return createEmptyCard(now);
}

export function cardFromFields(fields: Partial<FsrsCardFields> & { dueAt?: Date | null }, now: Date = new Date()): Card {
  if (fields.dueAt == null && fields.fsrsState == null && fields.stability == null) {
    return emptyFsrsCard(now);
  }
  const due = fields.dueAt ?? now;
  const state = (fields.fsrsState ?? State.New) as Card["state"];
  return {
    due,
    stability: fields.stability ?? 0,
    difficulty: fields.difficulty ?? 0,
    elapsed_days: 0,
    scheduled_days: fields.scheduledDays ?? 0,
    learning_steps: fields.learningSteps ?? 0,
    reps: fields.reps ?? 0,
    lapses: fields.lapses ?? 0,
    state,
    last_review: fields.lastReview ?? undefined,
  };
}

export function fieldsFromCard(card: Card): FsrsCardFields {
  return {
    fsrsState: Number(card.state),
    stability: card.stability,
    difficulty: card.difficulty,
    dueAt: card.due,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    lastReview: card.last_review ?? null,
  };
}

export function deriveConfidence(card: Pick<Card, "state" | "stability" | "reps">): number {
  const state = Number(card.state);
  if (state === State.New || state === State.Learning) return 1;
  if (state === State.Relearning) return 2;
  if (state === State.Review) {
    if ((card.stability ?? 0) >= CONFIDENT_STABILITY) return 4;
    if ((card.reps ?? 0) < 2) return 2;
    return 3;
  }
  return 1;
}

export function resolveLearningStatus(
  card: Pick<Card, "state" | "stability"> | null | undefined,
  opts?: { seen?: boolean }
): LearningStatusId {
  if (!card || opts?.seen === false || Number(card.state) === State.New) return "new";
  const state = Number(card.state);
  if (state === State.Learning) return "learning";
  if (state === State.Relearning) return "relearning";
  if (state === State.Review) {
    return (card.stability ?? 0) >= CONFIDENT_STABILITY ? "confident" : "reviewing";
  }
  return "new";
}

export function resolveLearningStatusFromWord(word: {
  fsrsState?: number | null;
  stability?: number | null;
  dueAt?: Date | string | null;
  lastPractice?: Date | string | null;
  lastReview?: Date | string | null;
  confidence?: number;
}): LearningStatusId {
  if (word.dueAt != null || word.fsrsState != null) {
    return resolveLearningStatus({
      state: (word.fsrsState ?? State.New) as Card["state"],
      stability: word.stability ?? 0,
    });
  }
  const seen = Boolean(word.lastPractice || word.lastReview);
  if (!seen) return "new";
  const conf = Math.min(4, Math.max(1, Math.round(word.confidence ?? 1)));
  if (conf <= 1) return "learning";
  if (conf === 2) return "relearning";
  if (conf === 3) return "reviewing";
  return "confident";
}

export function patchFromCard(card: Card): FsrsWordPatch {
  const fields = fieldsFromCard(card);
  return {
    ...fields,
    confidence: deriveConfidence(card),
    lastPractice: fields.lastReview,
  };
}

export function resolveRating(input: { rating?: number | null; confidence?: number | null }): Grade | null {
  const raw = input.rating != null ? input.rating : input.confidence;
  if (raw == null) return null;
  const value = Math.round(Number(raw));
  if (value < Rating.Again || value > Rating.Easy) return null;
  return value as Grade;
}

export function clampReviewedAt(
  reviewedAt: Date,
  lastReview: Date | null | undefined,
  now: Date = new Date()
): { ok: true; at: Date } | { ok: false; reason: "future" | "before_last" } {
  const maxFuture = now.getTime() + 5 * 60_000;
  if (reviewedAt.getTime() > maxFuture) return { ok: false, reason: "future" };
  if (lastReview && reviewedAt.getTime() < lastReview.getTime()) {
    return { ok: false, reason: "before_last" };
  }
  return { ok: true, at: reviewedAt };
}

export function applyFsrsRating(
  fields: Partial<FsrsCardFields>,
  rating: Grade,
  reviewedAt: Date,
  options?: { fuzz?: boolean }
): ApplyFsrsResult {
  const scheduler = options?.fuzz === false ? fsrsSchedulerForTests : fsrsScheduler;
  const card = cardFromFields(fields, reviewedAt);
  const record = scheduler.repeat(card, reviewedAt)[rating];
  return {
    card: record.card,
    log: record.log,
    patch: patchFromCard(record.card),
    rating,
  };
}

const PRESET_BASE: Record<
  LearningStatusId,
  {
    state: number;
    stability: number;
    difficulty: number;
    learningSteps: number;
    dueOffsetDays: number;
    reps: "zero" | "keep" | "at_least_2";
    lapses: "zero" | "keep" | "at_least_1";
  }
> = {
  new: {
    state: State.New,
    stability: 0,
    difficulty: 0,
    learningSteps: 0,
    dueOffsetDays: 0,
    reps: "zero",
    lapses: "zero",
  },
  learning: {
    state: State.Learning,
    stability: 0.3,
    difficulty: 5,
    learningSteps: 0,
    dueOffsetDays: 0,
    reps: "zero",
    lapses: "keep",
  },
  relearning: {
    state: State.Relearning,
    stability: 0.5,
    difficulty: 6,
    learningSteps: 0,
    dueOffsetDays: 0,
    reps: "keep",
    lapses: "at_least_1",
  },
  reviewing: {
    state: State.Review,
    stability: 7,
    difficulty: 5,
    learningSteps: 0,
    dueOffsetDays: 7,
    reps: "at_least_2",
    lapses: "keep",
  },
  confident: {
    state: State.Review,
    stability: MIGRATE_CONFIDENT_STABILITY,
    difficulty: 4,
    learningSteps: 0,
    dueOffsetDays: 21,
    reps: "at_least_2",
    lapses: "keep",
  },
};

/** Manual status preset — does NOT run FSRS repeat; sets lastReview = now. */
export function applyLearningStatusPreset(
  status: LearningStatusId,
  current: Partial<FsrsCardFields>,
  now: Date = new Date()
): FsrsWordPatch {
  const preset = PRESET_BASE[status];
  const reps =
    preset.reps === "zero" ? 0 : preset.reps === "at_least_2" ? Math.max(2, current.reps ?? 0) : current.reps ?? 0;
  const lapses =
    preset.lapses === "zero"
      ? 0
      : preset.lapses === "at_least_1"
        ? Math.max(1, current.lapses ?? 0)
        : current.lapses ?? 0;

  const card: Card = {
    due: new Date(now.getTime() + preset.dueOffsetDays * DAY_MS),
    stability: preset.stability,
    difficulty: preset.difficulty,
    elapsed_days: 0,
    scheduled_days: preset.dueOffsetDays,
    learning_steps: preset.learningSteps,
    reps,
    lapses,
    state: preset.state as Card["state"],
    last_review: now,
  };
  return patchFromCard(card);
}

/** Deterministic jitter offset in [0, 7d) from wordId. */
export function migrationJitterMs(wordId: number): number {
  let hash = wordId | 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  hash = (hash ^ (hash >>> 16)) >>> 0;
  return (hash % 7_000) * 86.4; // 0 .. ~604800000 ms (~7d)
}

export function migrateLegacyWordToFsrs(input: {
  wordId: number;
  confidence: number;
  lastPractice?: Date | null;
  now?: Date;
}): FsrsWordPatch {
  const now = input.now ?? new Date();
  const conf = Math.min(4, Math.max(1, Math.round(input.confidence || 1)));
  const last = input.lastPractice ?? null;

  if (!last) {
    const card = emptyFsrsCard(now);
    return patchFromCard(card);
  }

  let state = State.Learning;
  let stability = 0.3;
  let difficulty = 5;
  let reps = 0;
  let lapses = 0;
  let scheduledDays = 1;

  if (conf === 1) {
    state = State.Learning;
    stability = 0.3;
    difficulty = 5;
    reps = 0;
    scheduledDays = 1;
  } else if (conf === 2) {
    state = State.Relearning;
    stability = 0.5;
    difficulty = 6;
    reps = 1;
    lapses = 1;
    scheduledDays = 3;
  } else if (conf === 3) {
    state = State.Review;
    stability = 7;
    difficulty = 5;
    reps = 2;
    scheduledDays = 7;
  } else {
    state = State.Review;
    stability = MIGRATE_CONFIDENT_STABILITY;
    difficulty = 4;
    reps = 2;
    scheduledDays = 21;
  }

  const legacyDue = new Date(last.getTime() + reviewIntervalDays(conf) * DAY_MS);
  let dueAt = legacyDue;
  if (legacyDue.getTime() < now.getTime()) {
    dueAt = new Date(now.getTime() + migrationJitterMs(input.wordId));
  }

  const card: Card = {
    due: dueAt,
    stability,
    difficulty,
    elapsed_days: 0,
    scheduled_days: scheduledDays,
    learning_steps: 0,
    reps,
    lapses,
    state: state as Card["state"],
    last_review: last,
  };
  return patchFromCard(card);
}

