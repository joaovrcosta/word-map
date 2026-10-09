"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type User } from "@/actions/auth";
import { publicErrorMessage } from "@/lib/public-error";

const GENERIC_ERROR = "Não foi possível concluir a ação. Tente novamente.";

const PUBLIC_BOOK_MESSAGES = new Set([
  "Não autorizado",
  "Livro não encontrado",
  "Capítulo não encontrado",
  "Título obrigatório",
  "Conteúdo obrigatório",
  "Este livro já está na sua biblioteca",
  "Apenas administradores podem criar livros oficiais",
]);

export type BookListItem = {
  id: number;
  title: string;
  description: string | null;
  isOfficial: boolean;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
  chapterCount: number;
  inLibrary: boolean;
};

export type ChapterSummary = {
  id: number;
  bookId: number;
  title: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

export type BookDetail = BookListItem & {
  chapters: ChapterSummary[];
  canEdit: boolean;
};

export type ChapterDetail = {
  id: number;
  bookId: number;
  title: string;
  content: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  canEdit: boolean;
  bookTitle: string;
};

function isAdmin(user: User) {
  return user.role === "ADMIN";
}

function wrapError(error: unknown): never {
  if (error instanceof Error && PUBLIC_BOOK_MESSAGES.has(error.message)) {
    throw error;
  }
  console.error("Erro em books:", error);
  throw new Error(publicErrorMessage(error, GENERIC_ERROR));
}

async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Não autorizado");
  }
  return user;
}

async function canReadOfficial(user: User, bookId: number) {
  const entry = await prisma.userLibrary.findUnique({
    where: { userId_bookId: { userId: user.id, bookId } },
  });
  return Boolean(entry);
}

async function getAccessibleBook(user: User, bookId: number) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      chapters: { orderBy: { order: "asc" } },
      _count: { select: { chapters: true } },
    },
  });

  if (!book) {
    throw new Error("Livro não encontrado");
  }

  const isOwner = book.ownerId === user.id;
  if (isOwner) {
    return { book, isOwner, inLibrary: false };
  }

  if (book.isOfficial) {
    const inLibrary = await canReadOfficial(user, book.id);
    if (inLibrary || isAdmin(user)) {
      return { book, isOwner: false, inLibrary };
    }
  }

  throw new Error("Livro não encontrado");
}

function toListItem(
  book: {
    id: number;
    title: string;
    description: string | null;
    isOfficial: boolean;
    ownerId: number;
    createdAt: Date;
    updatedAt: Date;
    _count: { chapters: number };
  },
  inLibrary: boolean
): BookListItem {
  return {
    id: book.id,
    title: book.title,
    description: book.description,
    isOfficial: book.isOfficial,
    ownerId: book.ownerId,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    chapterCount: book._count.chapters,
    inLibrary,
  };
}

function revalidateBookPaths(bookId?: number) {
  revalidatePath("/home/books");
  if (bookId) {
    revalidatePath(`/home/books/${bookId}`);
  }
}

export async function createBook(title: string, description?: string) {
  try {
    const user = await requireUser();
    const trimmed = title.trim();
    if (!trimmed) {
      throw new Error("Título obrigatório");
    }

    const book = await prisma.book.create({
      data: {
        title: trimmed,
        description: description?.trim() || null,
        isOfficial: false,
        ownerId: user.id,
      },
    });

    revalidateBookPaths(book.id);
    return book;
  } catch (error) {
    wrapError(error);
  }
}

export async function createOfficialBook(title: string, description?: string) {
  try {
    const user = await requireUser();
    if (!isAdmin(user)) {
      throw new Error("Apenas administradores podem criar livros oficiais");
    }

    const trimmed = title.trim();
    if (!trimmed) {
      throw new Error("Título obrigatório");
    }

    const book = await prisma.book.create({
      data: {
        title: trimmed,
        description: description?.trim() || null,
        isOfficial: true,
        ownerId: user.id,
      },
    });

    revalidateBookPaths(book.id);
    return book;
  } catch (error) {
    wrapError(error);
  }
}

export async function updateBook(
  bookId: number,
  title: string,
  description?: string
) {
  try {
    const user = await requireUser();
    const existing = await prisma.book.findUnique({ where: { id: bookId } });
    if (!existing || existing.ownerId !== user.id) {
      throw new Error("Livro não encontrado");
    }

    const trimmed = title.trim();
    if (!trimmed) {
      throw new Error("Título obrigatório");
    }

    const book = await prisma.book.update({
      where: { id: bookId },
      data: {
        title: trimmed,
        description: description?.trim() || null,
      },
    });

    revalidateBookPaths(bookId);
    return book;
  } catch (error) {
    wrapError(error);
  }
}

export async function deleteBook(bookId: number) {
  try {
    const user = await requireUser();
    const existing = await prisma.book.findUnique({ where: { id: bookId } });
    if (!existing || existing.ownerId !== user.id) {
      throw new Error("Livro não encontrado");
    }

    await prisma.book.delete({ where: { id: bookId } });
    revalidateBookPaths();
  } catch (error) {
    wrapError(error);
  }
}

export async function listOfficialBooks(): Promise<BookListItem[]> {
  try {
    const user = await requireUser();
    const books = await prisma.book.findMany({
      where: { isOfficial: true },
      include: { _count: { select: { chapters: true } } },
      orderBy: { createdAt: "desc" },
    });

    const library = await prisma.userLibrary.findMany({
      where: { userId: user.id },
      select: { bookId: true },
    });
    const inLibraryIds = new Set(library.map((item) => item.bookId));

    return books.map((book) => toListItem(book, inLibraryIds.has(book.id)));
  } catch (error) {
    wrapError(error);
  }
}

export async function listMyBooks(): Promise<BookListItem[]> {
  try {
    const user = await requireUser();
    const books = await prisma.book.findMany({
      where: { ownerId: user.id, isOfficial: false },
      include: { _count: { select: { chapters: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return books.map((book) => toListItem(book, false));
  } catch (error) {
    wrapError(error);
  }
}

export async function listLibraryBooks(): Promise<BookListItem[]> {
  try {
    const user = await requireUser();
    const entries = await prisma.userLibrary.findMany({
      where: { userId: user.id },
      include: {
        book: { include: { _count: { select: { chapters: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return entries.map((entry) => toListItem(entry.book, true));
  } catch (error) {
    wrapError(error);
  }
}

export async function addBookToLibrary(bookId: number) {
  try {
    const user = await requireUser();
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book || !book.isOfficial) {
      throw new Error("Livro não encontrado");
    }

    const existing = await prisma.userLibrary.findUnique({
      where: { userId_bookId: { userId: user.id, bookId } },
    });
    if (existing) {
      throw new Error("Este livro já está na sua biblioteca");
    }

    await prisma.userLibrary.create({
      data: { userId: user.id, bookId },
    });
    revalidateBookPaths(bookId);
  } catch (error) {
    wrapError(error);
  }
}

export async function removeFromLibrary(bookId: number) {
  try {
    const user = await requireUser();
    await prisma.userLibrary.deleteMany({
      where: { userId: user.id, bookId },
    });
    revalidateBookPaths(bookId);
  } catch (error) {
    wrapError(error);
  }
}

export async function addChapter(
  bookId: number,
  title: string,
  content: string
) {
  try {
    const user = await requireUser();
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book || book.ownerId !== user.id) {
      throw new Error("Livro não encontrado");
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle) {
      throw new Error("Título obrigatório");
    }
    if (!trimmedContent) {
      throw new Error("Conteúdo obrigatório");
    }

    const last = await prisma.chapter.findFirst({
      where: { bookId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const chapter = await prisma.chapter.create({
      data: {
        bookId,
        title: trimmedTitle,
        content: trimmedContent,
        order: (last?.order ?? -1) + 1,
      },
    });

    revalidateBookPaths(bookId);
    return chapter;
  } catch (error) {
    wrapError(error);
  }
}

export async function updateChapter(
  chapterId: number,
  title: string,
  content: string
) {
  try {
    const user = await requireUser();
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { book: true },
    });
    if (!chapter || chapter.book.ownerId !== user.id) {
      throw new Error("Capítulo não encontrado");
    }

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle) {
      throw new Error("Título obrigatório");
    }
    if (!trimmedContent) {
      throw new Error("Conteúdo obrigatório");
    }

    const updated = await prisma.chapter.update({
      where: { id: chapterId },
      data: { title: trimmedTitle, content: trimmedContent },
    });

    revalidateBookPaths(chapter.bookId);
    revalidatePath(`/home/books/${chapter.bookId}/chapters/${chapterId}`);
    return updated;
  } catch (error) {
    wrapError(error);
  }
}

export async function deleteChapter(chapterId: number) {
  try {
    const user = await requireUser();
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { book: true },
    });
    if (!chapter || chapter.book.ownerId !== user.id) {
      throw new Error("Capítulo não encontrado");
    }

    await prisma.chapter.delete({ where: { id: chapterId } });
    revalidateBookPaths(chapter.bookId);
  } catch (error) {
    wrapError(error);
  }
}

export async function reorderChapters(bookId: number, chapterIds: number[]) {
  try {
    const user = await requireUser();
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { chapters: true },
    });
    if (!book || book.ownerId !== user.id) {
      throw new Error("Livro não encontrado");
    }

    const ownedIds = new Set(book.chapters.map((chapter) => chapter.id));
    if (
      chapterIds.length !== ownedIds.size ||
      chapterIds.some((id) => !ownedIds.has(id))
    ) {
      throw new Error("Capítulo não encontrado");
    }

    await prisma.$transaction(
      chapterIds.map((id, index) =>
        prisma.chapter.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    revalidateBookPaths(bookId);
  } catch (error) {
    wrapError(error);
  }
}

export async function getBookById(bookId: number): Promise<BookDetail | null> {
  try {
    const user = await requireUser();
    const { book, isOwner, inLibrary } = await getAccessibleBook(user, bookId);

    return {
      ...toListItem(book, inLibrary),
      canEdit: isOwner,
      chapters: book.chapters.map((chapter) => ({
        id: chapter.id,
        bookId: chapter.bookId,
        title: chapter.title,
        order: chapter.order,
        createdAt: chapter.createdAt,
        updatedAt: chapter.updatedAt,
      })),
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Livro não encontrado") {
      return null;
    }
    wrapError(error);
  }
}

export async function getChapterById(
  chapterId: number
): Promise<ChapterDetail | null> {
  try {
    const user = await requireUser();
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { book: true },
    });
    if (!chapter) {
      return null;
    }

    const { book, isOwner } = await getAccessibleBook(user, chapter.bookId);

    return {
      id: chapter.id,
      bookId: chapter.bookId,
      title: chapter.title,
      content: chapter.content,
      order: chapter.order,
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt,
      canEdit: isOwner,
      bookTitle: book.title,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Livro não encontrado") {
      return null;
    }
    wrapError(error);
  }
}
