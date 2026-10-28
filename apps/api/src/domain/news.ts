import { prisma } from "../prisma/client";

export type NewsInput = {
  section: string;
  title: string;
  summary: string;
  body: string;
  imageUrl?: string | null;
  imageCaption?: string | null;
  tags?: string[] | string | null;
};

function estimateListenSeconds(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(30, Math.round((words / 150) * 60));
}

function parseTags(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) {
    return value.map((tag) => tag.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function fields(input: NewsInput) {
  const section = input.section?.trim() ?? "";
  const title = input.title?.trim() ?? "";
  const summary = input.summary?.trim() ?? "";
  const body = input.body?.trim() ?? "";
  if (!section) throw new Error("Seção obrigatória");
  if (!title) throw new Error("Título obrigatório");
  if (!summary) throw new Error("Resumo obrigatório");
  if (!body) throw new Error("Texto obrigatório");
  const imageUrl = input.imageUrl?.trim() || null;
  const imageCaption = input.imageCaption?.trim() || null;
  return {
    section,
    title,
    summary,
    body,
    imageUrl,
    imageCaption,
    tags: parseTags(input.tags),
  };
}

function toPublic(article: {
  id: number;
  section: string;
  title: string;
  summary: string;
  body: string;
  imageUrl: string | null;
  imageCaption: string | null;
  tags: string[];
  publishedAt: Date | null;
}) {
  const listenSeconds = estimateListenSeconds(`${article.summary}\n${article.body}`);
  return {
    id: article.id,
    section: article.section,
    title: article.title,
    summary: article.summary,
    body: article.body,
    imageUrl: article.imageUrl,
    imageCaption: article.imageCaption,
    tags: article.tags,
    publishedAt: article.publishedAt,
    listenSeconds,
  };
}

function toHub(article: {
  id: number;
  section: string;
  title: string;
  summary: string;
  body: string;
  imageUrl: string | null;
  imageCaption: string | null;
  tags: string[];
  publishedAt: Date | null;
  updatedAt: Date;
}) {
  return {
    ...toPublic(article),
    updatedAt: article.updatedAt,
  };
}

export async function listPublishedNews() {
  const articles = await prisma.newsArticle.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
  });
  return articles.map((article) => ({
    id: article.id,
    section: article.section,
    title: article.title,
    summary: article.summary,
    imageUrl: article.imageUrl,
    tags: article.tags,
    publishedAt: article.publishedAt,
    listenSeconds: estimateListenSeconds(`${article.summary}\n${article.body}`),
  }));
}

export async function getPublishedNews(id: number) {
  const article = await prisma.newsArticle.findFirst({
    where: { id, publishedAt: { not: null } },
  });
  if (!article) throw new Error("Notícia não encontrada");
  return toPublic(article);
}

export async function listHubNews() {
  const articles = await prisma.newsArticle.findMany({ orderBy: { updatedAt: "desc" } });
  return articles.map((article) => ({
    id: article.id,
    section: article.section,
    title: article.title,
    summary: article.summary,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    tagCount: article.tags.length,
  }));
}

export async function getHubNews(id: number) {
  const article = await prisma.newsArticle.findUnique({ where: { id } });
  if (!article) throw new Error("Notícia não encontrada");
  return toHub(article);
}

export async function createNews(input: NewsInput) {
  const article = await prisma.newsArticle.create({ data: fields(input) });
  return toHub(article);
}

export async function updateNews(id: number, input: NewsInput) {
  await getHubNews(id);
  const article = await prisma.newsArticle.update({ where: { id }, data: fields(input) });
  return toHub(article);
}

export async function setNewsPublished(id: number, published: boolean) {
  const article = await prisma.newsArticle.findUnique({ where: { id } });
  if (!article) throw new Error("Notícia não encontrada");
  if (published && !article.body.trim()) {
    throw new Error("Adicione o texto antes de publicar");
  }
  const next = await prisma.newsArticle.update({
    where: { id },
    data: { publishedAt: published ? new Date() : null },
  });
  return toHub(next);
}

export async function deleteNews(id: number) {
  await getHubNews(id);
  await prisma.newsArticle.delete({ where: { id } });
}
