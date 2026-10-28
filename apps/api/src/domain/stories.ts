import { Prisma, type StoryChallengeKind } from "@prisma/client";
import { getCurrentUser } from "../auth/current-user";
import { sameIdSet } from "../lib/story-answer";
import { STORY_COMPLETION_POINTS } from "../lib/points";
import { prisma } from "../prisma/client";

const storyInclude = {
  book: { select: { id: true, title: true, isOfficial: true } },
  steps: {
    orderBy: { order: "asc" as const },
    include: {
      challenge: { include: { options: { orderBy: { order: "asc" as const } } } },
    },
  },
} satisfies Prisma.StoryInclude;

type StoryRecord = Prisma.StoryGetPayload<{ include: typeof storyInclude }>;
type StepRecord = StoryRecord["steps"][number];

export type ChallengeInput =
  | { kind: "TRUE_FALSE"; prompt: string; correct: boolean }
  | { kind: "CHOICE"; prompt: string; options: Array<{ text: string; correct: boolean }> };

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Usuário não autenticado");
  return user;
}

export async function listPublishedStories() {
  const user = await requireUser();
  const stories = await prisma.story.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    include: {
      steps: { select: { challenge: { select: { id: true } } } },
      completions: {
        where: { userId: user.id },
        select: { correctCount: true, challengeCount: true, points: true },
      },
    },
  });
  return stories.map((story) => ({
    id: story.id,
    title: story.title,
    theme: story.theme,
    stepCount: story.steps.length,
    challengeCount: story.steps.filter((step) => step.challenge).length,
    completion: story.completions[0] ?? null,
  }));
}

export async function getPublishedStory(storyId: number) {
  const user = await requireUser();
  const story = await prisma.story.findFirst({
    where: { id: storyId, publishedAt: { not: null } },
    include: {
      ...storyInclude,
      completions: {
        where: { userId: user.id },
        select: { correctCount: true, challengeCount: true, points: true },
      },
    },
  });
  if (!story) throw new Error("História não encontrada");
  return {
    id: story.id,
    title: story.title,
    theme: story.theme,
    bookTitle: story.book?.title ?? null,
    completion: story.completions[0] ?? null,
    steps: story.steps.map(toPublicStep),
  };
}

export async function startStory(storyId: number) {
  const user = await requireUser();
  const story = await prisma.story.findFirst({
    where: { id: storyId, publishedAt: { not: null } },
    select: { id: true },
  });
  if (!story) throw new Error("História não encontrada");
  // Nova leitura: limpa tentativas desta história para o feedback refletir a rodada atual.
  // A conclusão (XP) só grava uma vez; tentativas antigas não devem travar o "Quase!".
  await prisma.storyAttempt.deleteMany({
    where: { userId: user.id, challenge: { step: { storyId } } },
  });
  return { ok: true as const };
}

export async function answerStoryStep(
  storyId: number,
  stepId: number,
  input: { value?: boolean; optionIds?: number[] }
) {
  const user = await requireUser();
  const step = await publishedStep(storyId, stepId);
  if (!step.challenge) throw new Error("Este passo não tem exercício");
  const challenge = step.challenge;
  const correctNow = grade(challenge, input);
  const existing = await prisma.storyAttempt.findUnique({
    where: { userId_challengeId: { userId: user.id, challengeId: challenge.id } },
  });
  if (existing) return answerPayload(challenge, existing.correct);

  try {
    await prisma.storyAttempt.create({
      data: { userId: user.id, challengeId: challenge.id, correct: correctNow },
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    const raced = await prisma.storyAttempt.findUnique({
      where: { userId_challengeId: { userId: user.id, challengeId: challenge.id } },
    });
    if (!raced) throw error;
    return answerPayload(challenge, raced.correct);
  }
  return answerPayload(challenge, correctNow);
}

async function storyRunStats(userId: number, storyId: number) {
  const challenges = await prisma.storyChallenge.findMany({
    where: { step: { storyId } },
    select: { id: true },
  });
  const attempts = challenges.length
    ? await prisma.storyAttempt.findMany({
        where: { userId, challengeId: { in: challenges.map((item) => item.id) } },
        select: { correct: true },
      })
    : [];
  return {
    correctCount: attempts.filter((attempt) => attempt.correct).length,
    challengeCount: challenges.length,
  };
}

export async function completeStory(storyId: number) {
  const user = await requireUser();
  const story = await prisma.story.findFirst({
    where: { id: storyId, publishedAt: { not: null } },
    select: { id: true },
  });
  if (!story) throw new Error("História não encontrada");

  const stats = await storyRunStats(user.id, storyId);
  const saved = await prisma.storyCompletion.findUnique({
    where: { userId_storyId: { userId: user.id, storyId } },
  });
  // Replay: XP já foi dado, mas o placar da tela é desta leitura.
  if (saved) {
    return completionPayload(
      { correctCount: stats.correctCount, challengeCount: stats.challengeCount, points: 0 },
      false
    );
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const completion = await tx.storyCompletion.create({
        data: {
          userId: user.id,
          storyId,
          correctCount: stats.correctCount,
          challengeCount: stats.challengeCount,
          points: STORY_COMPLETION_POINTS,
        },
      });
      await tx.pointAward.create({
        data: {
          userId: user.id,
          points: STORY_COMPLETION_POINTS,
          source: "story",
          dedupeKey: `story:${user.id}:${storyId}`,
        },
      });
      return completion;
    });
    return completionPayload(created, true);
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    return completionPayload(
      { correctCount: stats.correctCount, challengeCount: stats.challengeCount, points: 0 },
      false
    );
  }
}

export async function listHubStories() {
  const stories = await prisma.story.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { steps: true } }, book: { select: { title: true } } },
  });
  return stories.map((story) => ({
    id: story.id,
    title: story.title,
    theme: story.theme,
    bookTitle: story.book?.title ?? null,
    stepCount: story._count.steps,
    publishedAt: story.publishedAt,
    updatedAt: story.updatedAt,
  }));
}

export async function getHubStory(storyId: number) {
  const story = await prisma.story.findUnique({ where: { id: storyId }, include: storyInclude });
  if (!story) throw new Error("História não encontrada");
  return toHubStory(story);
}

export async function createStory(input: { title: string; theme: string; bookId?: number | null }) {
  const data = await storyData(input);
  const story = await prisma.story.create({ data, include: storyInclude });
  return toHubStory(story);
}

export async function updateStory(
  storyId: number,
  input: { title: string; theme: string; bookId?: number | null }
) {
  await getHubStory(storyId);
  const data = await storyData(input);
  const story = await prisma.story.update({ where: { id: storyId }, data, include: storyInclude });
  return toHubStory(story);
}

export async function setStoryPublished(storyId: number, published: boolean) {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { _count: { select: { steps: true } } },
  });
  if (!story) throw new Error("História não encontrada");
  if (published && story._count.steps === 0) {
    throw new Error("Adicione uma fala antes de publicar");
  }
  const next = await prisma.story.update({
    where: { id: storyId },
    data: { publishedAt: published ? new Date() : null },
    include: storyInclude,
  });
  return toHubStory(next);
}

export async function deleteStory(storyId: number) {
  await getHubStory(storyId);
  await prisma.story.delete({ where: { id: storyId } });
}

export async function addStoryStep(storyId: number, input: StepInput) {
  await getHubStory(storyId);
  const fields = stepFields(input);
  const challenge = parseChallenge(input.challenge);
  const last = await prisma.storyStep.findFirst({
    where: { storyId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.storyStep.create({
    data: {
      storyId,
      order: (last?.order ?? -1) + 1,
      ...fields,
      challenge: challenge ? challengeCreate(challenge) : undefined,
    },
  });
  return getHubStory(storyId);
}

export async function updateStoryStep(stepId: number, input: StepInput) {
  const step = await prisma.storyStep.findUnique({ where: { id: stepId }, select: { storyId: true } });
  if (!step) throw new Error("Fala não encontrada");
  const fields = stepFields(input);
  const challenge = parseChallenge(input.challenge);
  await prisma.$transaction(async (tx) => {
    await tx.storyChallenge.deleteMany({ where: { stepId } });
    await tx.storyStep.update({
      where: { id: stepId },
      data: {
        ...fields,
        challenge: challenge ? challengeCreate(challenge) : undefined,
      },
    });
  });
  return getHubStory(step.storyId);
}

export async function deleteStoryStep(stepId: number) {
  const step = await prisma.storyStep.findUnique({ where: { id: stepId }, select: { storyId: true } });
  if (!step) throw new Error("Fala não encontrada");
  await prisma.storyStep.delete({ where: { id: stepId } });
  return getHubStory(step.storyId);
}

export async function reorderStorySteps(storyId: number, stepIds: number[]) {
  await prisma.$transaction(async (tx) => {
    const steps = await tx.storyStep.findMany({ where: { storyId }, select: { id: true } });
    const current = new Set(steps.map((step) => step.id));
    const next = new Set(stepIds);
    if (current.size !== next.size || steps.some((step) => !next.has(step.id)) || stepIds.some((id) => !current.has(id))) {
      throw new Error("A ordem precisa incluir todas as falas");
    }
    for (let index = 0; index < stepIds.length; index += 1) {
      await tx.storyStep.update({ where: { id: stepIds[index] }, data: { order: index } });
    }
  });
  return getHubStory(storyId);
}

type StepInput = {
  speaker?: string | null;
  text: string;
  translation: string;
  challenge?: unknown;
};

function stepFields(input: StepInput) {
  const text = input.text?.trim() ?? "";
  const translation = input.translation?.trim() ?? "";
  if (!text) throw new Error("Texto obrigatório");
  if (!translation) throw new Error("Tradução obrigatória");
  const speaker = input.speaker?.trim() || null;
  return { speaker, text, translation };
}

async function storyData(input: { title: string; theme: string; bookId?: number | null }) {
  const title = input.title?.trim() ?? "";
  const theme = input.theme?.trim() ?? "";
  if (!title) throw new Error("Título obrigatório");
  if (!theme) throw new Error("Tema obrigatório");
  let bookId: number | null = null;
  if (input.bookId != null) {
    const book = await prisma.book.findFirst({ where: { id: input.bookId, isOfficial: true } });
    if (!book) throw new Error("Livro não encontrado");
    bookId = book.id;
  }
  return { title, theme, bookId };
}

function parseChallenge(value: unknown): ChallengeInput | null {
  if (value == null) return null;
  if (typeof value !== "object") throw new Error("Exercício inválido");
  const raw = value as { kind?: unknown; prompt?: unknown; correct?: unknown; options?: unknown };
  const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
  if (!prompt) throw new Error("Enunciado obrigatório");
  if (raw.kind === "TRUE_FALSE") {
    if (typeof raw.correct !== "boolean") throw new Error("Marque se a afirmação é verdadeira");
    return { kind: "TRUE_FALSE", prompt, correct: raw.correct };
  }
  if (raw.kind === "CHOICE") {
    if (!Array.isArray(raw.options) || raw.options.length < 2) {
      throw new Error("A escolha precisa de pelo menos duas opções");
    }
    const options = raw.options.map((item) => {
      if (!item || typeof item !== "object") throw new Error("Opção inválida");
      const option = item as { text?: unknown; correct?: unknown };
      const text = typeof option.text === "string" ? option.text.trim() : "";
      if (!text) throw new Error("Texto da opção obrigatório");
      if (typeof option.correct !== "boolean") throw new Error("Marque as opções certas");
      return { text, correct: option.correct };
    });
    if (!options.some((option) => option.correct)) throw new Error("Marque pelo menos uma opção certa");
    return { kind: "CHOICE", prompt, options };
  }
  throw new Error("Tipo de exercício inválido");
}

function challengeCreate(input: ChallengeInput): Prisma.StoryChallengeCreateNestedOneWithoutStepInput {
  if (input.kind === "TRUE_FALSE") {
    return { create: { kind: "TRUE_FALSE", prompt: input.prompt, correct: input.correct } };
  }
  return {
    create: {
      kind: "CHOICE",
      prompt: input.prompt,
      options: {
        create: input.options.map((option, order) => ({
          text: option.text,
          correct: option.correct,
          order,
        })),
      },
    },
  };
}

async function publishedStep(storyId: number, stepId: number) {
  const step = await prisma.storyStep.findFirst({
    where: { id: stepId, storyId, story: { publishedAt: { not: null } } },
    include: { challenge: { include: { options: true } } },
  });
  if (!step) throw new Error("Fala não encontrada");
  return step;
}

function grade(
  challenge: NonNullable<StepRecord["challenge"]>,
  input: { value?: boolean; optionIds?: number[] }
) {
  if (challenge.kind === "TRUE_FALSE") {
    if (typeof input.value !== "boolean") throw new Error("Responda se é verdade ou não");
    return input.value === challenge.correct;
  }
  const optionIds = input.optionIds ?? [];
  if (optionIds.length === 0) throw new Error("Escolha ao menos uma opção");
  const known = new Set(challenge.options.map((option) => option.id));
  if (optionIds.some((id) => !known.has(id))) throw new Error("Opção inválida");
  const correctIds = challenge.options.filter((option) => option.correct).map((option) => option.id);
  return sameIdSet(optionIds, correctIds);
}

function answerPayload(challenge: NonNullable<StepRecord["challenge"]>, correct: boolean) {
  if (challenge.kind === "TRUE_FALSE") {
    return { correct, correctValue: challenge.correct === true };
  }
  return {
    correct,
    correctOptionIds: challenge.options.filter((option) => option.correct).map((option) => option.id),
  };
}

function toPublicStep(step: StepRecord) {
  return {
    id: step.id,
    order: step.order,
    speaker: step.speaker,
    text: step.text,
    translation: step.translation,
    challenge: step.challenge
      ? {
          id: step.challenge.id,
          kind: step.challenge.kind,
          prompt: step.challenge.prompt,
          pickCount:
            step.challenge.kind === "CHOICE"
              ? step.challenge.options.filter((option) => option.correct).length
              : 1,
          options:
            step.challenge.kind === "CHOICE"
              ? step.challenge.options.map((option) => ({ id: option.id, text: option.text }))
              : [],
        }
      : null,
  };
}

function toHubStory(story: StoryRecord) {
  return {
    id: story.id,
    title: story.title,
    theme: story.theme,
    bookId: story.bookId,
    bookTitle: story.book?.title ?? null,
    publishedAt: story.publishedAt,
    steps: story.steps.map((step) => ({
      id: step.id,
      order: step.order,
      speaker: step.speaker,
      text: step.text,
      translation: step.translation,
      challenge: step.challenge
        ? {
            id: step.challenge.id,
            kind: step.challenge.kind satisfies StoryChallengeKind,
            prompt: step.challenge.prompt,
            correct: step.challenge.correct,
            options: step.challenge.options.map((option) => ({
              id: option.id,
              text: option.text,
              correct: option.correct,
            })),
          }
        : null,
    })),
  };
}

function completionPayload(
  row: { correctCount: number; challengeCount: number; points: number },
  awarded: boolean
) {
  return {
    correctCount: row.correctCount,
    challengeCount: row.challengeCount,
    points: row.points,
    awarded,
  };
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
