import { Injectable } from "@nestjs/common";
import type { ContentLevel, UserRole } from "@prisma/client";
import { getCurrentUser } from "../auth/current-user";
import {
  addChapter,
  createOfficialBook,
  deleteBook,
  deleteChapter,
  getBookById,
  reorderChapters,
  updateBook,
  updateChapter,
} from "../domain/books";
import {
  addStoryStep as insertStoryStep,
  createStory as insertStory,
  deleteStory as removeStoryRecord,
  deleteStoryStep as removeStoryStepRecord,
  getHubStory,
  listHubStories,
  reorderStorySteps as reorderStoryStepRecords,
  setStoryPublished,
  updateStory as saveStory,
  updateStoryStep as saveStoryStep,
} from "../domain/stories";
import {
  createNews as insertNews,
  deleteNews as removeNewsRecord,
  getHubNews,
  listHubNews,
  setNewsPublished,
  updateNews as saveNews,
  type NewsInput,
} from "../domain/news";
import { prisma } from "../prisma/client";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const ROLES = ["USER", "MODERATOR", "ADMIN"] as const;

function parseLevel(value?: string | null): ContentLevel | null {
  if (!value?.trim()) return null;
  const level = value.trim().toUpperCase();
  if (!LEVELS.includes(level as (typeof LEVELS)[number])) {
    throw new Error("Nível inválido");
  }
  return level as ContentLevel;
}

@Injectable()
export class HubService {
  async listBooks() {
    const books = await prisma.book.findMany({
      where: { isOfficial: true },
      include: { _count: { select: { chapters: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return books.map((book) => ({
      id: book.id,
      title: book.title,
      description: book.description,
      coverUrl: book.coverUrl,
      chapterCount: book._count.chapters,
      updatedAt: book.updatedAt,
    }));
  }

  async book(bookId: number) {
    const detail = await getBookById(bookId);
    if (!detail?.isOfficial) {
      throw new Error("Livro não encontrado");
    }
    const chapters = await prisma.chapter.findMany({
      where: { bookId },
      orderBy: { order: "asc" },
    });
    return { ...detail, chapters };
  }

  createBook(title: string, description?: string, coverUrl?: string) {
    return createOfficialBook(title, description, coverUrl);
  }

  updateBook(bookId: number, title: string, description?: string, coverUrl?: string) {
    return this.officialBook(bookId).then(() =>
      updateBook(bookId, title, description, coverUrl)
    );
  }

  async removeBook(bookId: number) {
    await this.officialBook(bookId);
    await deleteBook(bookId);
  }

  async addChapter(bookId: number, title: string, content: string) {
    await this.officialBook(bookId);
    return addChapter(bookId, title, content);
  }

  async updateChapter(chapterId: number, title: string, content: string) {
    await this.officialChapter(chapterId);
    return updateChapter(chapterId, title, content);
  }

  async removeChapter(chapterId: number) {
    await this.officialChapter(chapterId);
    await deleteChapter(chapterId);
  }

  async reorder(bookId: number, chapterIds: number[]) {
    await this.officialBook(bookId);
    await reorderChapters(bookId, chapterIds);
  }

  listStories() {
    return listHubStories();
  }

  story(storyId: number) {
    return getHubStory(storyId);
  }

  createStory(input: { title: string; theme: string; bookId?: number | null }) {
    return insertStory(input);
  }

  updateStory(storyId: number, input: { title: string; theme: string; bookId?: number | null }) {
    return saveStory(storyId, input);
  }

  publishStory(storyId: number, published: boolean) {
    return setStoryPublished(storyId, published);
  }

  removeStory(storyId: number) {
    return removeStoryRecord(storyId);
  }

  addStoryStep(
    storyId: number,
    input: { speaker?: string | null; text: string; translation: string; challenge?: unknown }
  ) {
    return insertStoryStep(storyId, input);
  }

  updateStoryStep(
    stepId: number,
    input: { speaker?: string | null; text: string; translation: string; challenge?: unknown }
  ) {
    return saveStoryStep(stepId, input);
  }

  removeStoryStep(stepId: number) {
    return removeStoryStepRecord(stepId);
  }

  reorderStorySteps(storyId: number, stepIds: number[]) {
    return reorderStoryStepRecords(storyId, stepIds);
  }

  listNews() {
    return listHubNews();
  }

  news(id: number) {
    return getHubNews(id);
  }

  createNews(input: NewsInput) {
    return insertNews(input);
  }

  updateNews(id: number, input: NewsInput) {
    return saveNews(id, input);
  }

  publishNews(id: number, published: boolean) {
    return setNewsPublished(id, published);
  }

  removeNews(id: number) {
    return removeNewsRecord(id);
  }

  async listTexts() {
    const texts = await prisma.text.findMany({
      where: { isCatalog: true },
      orderBy: { updatedAt: "desc" },
    });
    return texts.map(toCatalogText);
  }

  async text(textId: number) {
    const text = await prisma.text.findFirst({
      where: { id: textId, isCatalog: true },
    });
    if (!text) throw new Error("Texto não encontrado");
    return toCatalogText(text);
  }

  async createText(input: CatalogTextInput) {
    const user = await requireStaff();
    const data = catalogData(input);
    const text = await prisma.text.create({
      data: { ...data, isCatalog: true, userId: user.id },
    });
    return toCatalogText(text);
  }

  async updateText(textId: number, input: CatalogTextInput) {
    await this.text(textId);
    const text = await prisma.text.update({
      where: { id: textId },
      data: catalogData(input),
    });
    return toCatalogText(text);
  }

  async removeText(textId: number) {
    await this.text(textId);
    await prisma.text.delete({ where: { id: textId } });
  }

  async listStaff() {
    return prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateRole(userId: number, role: string) {
    const actor = await requireStaff();
    if (!ROLES.includes(role as (typeof ROLES)[number])) {
      throw new Error("Papel inválido");
    }
    const nextRole = role as UserRole;
    if (actor.id === userId && actor.role === "ADMIN" && nextRole !== "ADMIN") {
      throw new Error("Você não pode remover o seu próprio acesso de administrador");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("Usuário não encontrado");

    return prisma.user.update({
      where: { id: userId },
      data: { role: nextRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  private async officialBook(bookId: number) {
    const book = await prisma.book.findFirst({
      where: { id: bookId, isOfficial: true },
    });
    if (!book) throw new Error("Livro não encontrado");
    return book;
  }

  private async officialChapter(chapterId: number) {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { book: true },
    });
    if (!chapter?.book.isOfficial) throw new Error("Capítulo não encontrado");
    return chapter;
  }
}

type CatalogTextInput = {
  title: string;
  content: string;
  summary?: string;
  level?: string;
};

function catalogData(input: CatalogTextInput) {
  const title = input.title?.trim() ?? "";
  const content = input.content?.trim() ?? "";
  if (!title) throw new Error("Título obrigatório");
  if (!content) throw new Error("Conteúdo obrigatório");
  return {
    title,
    content,
    summary: input.summary?.trim() || null,
    level: parseLevel(input.level),
  };
}

function toCatalogText(text: {
  id: number;
  title: string;
  content: string;
  summary: string | null;
  level: ContentLevel | null;
  updatedAt: Date;
  createdAt: Date;
}) {
  return {
    id: text.id,
    title: text.title,
    content: text.content,
    summary: text.summary,
    level: text.level,
    createdAt: text.createdAt,
    updatedAt: text.updatedAt,
  };
}

async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autorizado");
  return user;
}
