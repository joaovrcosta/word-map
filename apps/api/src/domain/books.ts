
import { revalidatePath } from "../common/revalidate";
import { prisma } from "../prisma/client";
import {
  getCurrentUser,
  isContentStaff,
  type User,
} from "../auth/current-user";
import { publicErrorMessage } from "../lib/public-error";
import {
  chapterContentRevision,
  countWords,
  estimateReadingMinutes,
  formatChapterContent,
} from "@word-map/shared/reading-pages";

const GENERIC_ERROR = "Não foi possível concluir a ação. Tente novamente.";

const PUBLIC_BOOK_MESSAGES = new Set([
  "Não autorizado",
  "Livro não encontrado",
  "Capítulo não encontrado",
  "Título obrigatório",
  "Conteúdo obrigatório",
  "Este livro já está na sua biblioteca",
  "Apenas administradores e moderadores podem criar livros oficiais",
]);

export type BookListItem = {
  id: number;
  title: string;
  description: string | null;
  coverUrl: string | null;
  isOfficial: boolean;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
  chapterCount: number;
  inLibrary: boolean;
};

export type ContentRevision = {
  contentLength: number;
  contentHash: string;
  normalizationVersion: number;
};

export type ChapterSummary = {
  id: number;
  bookId: number;
  title: string;
  order: number;
  contentLength: number;
  createdAt: Date;
  updatedAt: Date;
  contentOffset: number | null;
  reachedEndAt: Date | null;
  /** Quando o usuário tocou/salvou progresso neste capítulo pela última vez. */
  progressUpdatedAt: Date | null;
};

export type BookDetail = BookListItem & {
  chapters: ChapterSummary[];
  canEdit: boolean;
  /** Fração 0..1 pela soma de offsets / soma de contentLength. */
  readingFraction: number;
  wordCount: number;
  readingMinutes: number;
};

export type ReadingPosition = {
  pageIndex: number;
  paragraphIndex: number;
  contentOffset: number | null;
  reachedEndAt: Date | null;
  contentRevision: ContentRevision;
};

export type SaveReadingProgressInput = {
  pageIndex: number;
  paragraphIndex: number;
  contentOffset?: number | null;
  contentRevision?: ContentRevision | null;
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
  contentRevision: ContentRevision;
};

function revisionForContent(content: string): ContentRevision {
  return chapterContentRevision(content);
}

function revisionFromChapter(chapter: {
  content: string;
  contentLength: number;
  contentHash: string;
  normalizationVersion: number;
}): ContentRevision {
  if (
    chapter.normalizationVersion > 0 &&
    chapter.contentLength > 0 &&
    chapter.contentHash
  ) {
    return {
      contentLength: chapter.contentLength,
      contentHash: chapter.contentHash,
      normalizationVersion: chapter.normalizationVersion,
    };
  }
  return revisionForContent(chapter.content);
}

function canManageBook(
  user: User,
  book: { ownerId: number; isOfficial: boolean }
) {
  return book.ownerId === user.id || (book.isOfficial && isContentStaff(user.role));
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
  const inLibrary = await canReadOfficial(user, book.id);

  // Livro próprio conta como “salvo”; oficial usa a biblioteca real (antes o owner
  // forçava inLibrary=false e o bookmark ficava outline mesmo já salvo).
  if (isOwner) {
    return { book, isOwner, inLibrary: book.isOfficial ? inLibrary : true };
  }

  if (book.isOfficial) {
    if (inLibrary || isContentStaff(user.role)) {
      return { book, isOwner: false, inLibrary };
    }
  }

  throw new Error("Livro não encontrado");
}

function normalizeCoverUrl(value?: string | null) {
  const trimmed = value?.trim() || null;
  return trimmed || null;
}

function toListItem(
  book: {
    id: number;
    title: string;
    description: string | null;
    coverUrl: string | null;
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
    coverUrl: book.coverUrl,
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

export async function createBook(title: string, description?: string, coverUrl?: string | null) {
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
        coverUrl: normalizeCoverUrl(coverUrl),
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

export async function createOfficialBook(
  title: string,
  description?: string,
  coverUrl?: string | null
) {
  try {
    const user = await requireUser();
    if (!isContentStaff(user.role)) {
      throw new Error(
        "Apenas administradores e moderadores podem criar livros oficiais"
      );
    }

    const trimmed = title.trim();
    if (!trimmed) {
      throw new Error("Título obrigatório");
    }

    const book = await prisma.book.create({
      data: {
        title: trimmed,
        description: description?.trim() || null,
        coverUrl: normalizeCoverUrl(coverUrl),
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
  description?: string,
  coverUrl?: string | null
) {
  try {
    const user = await requireUser();
    const existing = await prisma.book.findUnique({ where: { id: bookId } });
    if (!existing || !canManageBook(user, existing)) {
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
        coverUrl: normalizeCoverUrl(coverUrl),
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
    if (!existing || !canManageBook(user, existing)) {
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

const CONTINUE_BOOKS_LIMIT = 3;

/** Até 3 livros com progresso mais recente deste usuário (únicos, por updatedAt). */
export async function getContinueReadingBooks(): Promise<BookListItem[]> {
  try {
    const user = await requireUser();
    const rows = await prisma.readingProgress.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        chapter: {
          select: {
            book: {
              include: { _count: { select: { chapters: true } } },
            },
          },
        },
      },
    });

    const seen = new Set<number>();
    const books: Array<{
      id: number;
      title: string;
      description: string | null;
      coverUrl: string | null;
      isOfficial: boolean;
      ownerId: number;
      createdAt: Date;
      updatedAt: Date;
      _count: { chapters: number };
    }> = [];
    for (const row of rows) {
      const book = row.chapter.book;
      if (seen.has(book.id)) continue;
      seen.add(book.id);
      books.push(book);
      if (books.length >= CONTINUE_BOOKS_LIMIT) break;
    }
    if (books.length === 0) return [];

    const library = await prisma.userLibrary.findMany({
      where: { userId: user.id, bookId: { in: books.map((book) => book.id) } },
      select: { bookId: true },
    });
    const inLibraryIds = new Set(library.map((entry) => entry.bookId));
    return books.map((book) => toListItem(book, inLibraryIds.has(book.id)));
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
    if (!book || !canManageBook(user, book)) {
      throw new Error("Livro não encontrado");
    }

    const trimmedTitle = title.trim();
    const trimmedContent = formatChapterContent(content);
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

    const revision = revisionForContent(trimmedContent);
    const chapter = await prisma.chapter.create({
      data: {
        bookId,
        title: trimmedTitle,
        content: trimmedContent,
        order: (last?.order ?? -1) + 1,
        contentLength: revision.contentLength,
        contentHash: revision.contentHash,
        normalizationVersion: revision.normalizationVersion,
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
    if (!chapter || !canManageBook(user, chapter.book)) {
      throw new Error("Capítulo não encontrado");
    }

    const trimmedTitle = title.trim();
    const trimmedContent = formatChapterContent(content);
    if (!trimmedTitle) {
      throw new Error("Título obrigatório");
    }
    if (!trimmedContent) {
      throw new Error("Conteúdo obrigatório");
    }

    const revision = revisionForContent(trimmedContent);
    const updated = await prisma.chapter.update({
      where: { id: chapterId },
      data: {
        title: trimmedTitle,
        content: trimmedContent,
        contentLength: revision.contentLength,
        contentHash: revision.contentHash,
        normalizationVersion: revision.normalizationVersion,
      },
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
    if (!chapter || !canManageBook(user, chapter.book)) {
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
    if (!book || !canManageBook(user, book)) {
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
    const progressRows = await prisma.readingProgress.findMany({
      where: {
        userId: user.id,
        chapterId: { in: book.chapters.map((chapter) => chapter.id) },
      },
      select: {
        chapterId: true,
        contentOffset: true,
        reachedEndAt: true,
        updatedAt: true,
      },
    });
    const progressByChapter = new Map(
      progressRows.map((row) => [row.chapterId, row])
    );

    let totalLength = 0;
    let totalOffset = 0;
    let wordCount = 0;
    const chapters = book.chapters.map((chapter) => {
      const revision = revisionFromChapter(chapter);
      const progress = progressByChapter.get(chapter.id);
      const contentOffset = progress?.contentOffset ?? null;
      const reachedEndAt = progress?.reachedEndAt ?? null;
      totalLength += revision.contentLength;
      wordCount += countWords(chapter.content);
      if (reachedEndAt || contentOffset === revision.contentLength) {
        totalOffset += revision.contentLength;
      } else if (contentOffset != null) {
        totalOffset += Math.min(
          Math.max(0, contentOffset),
          revision.contentLength
        );
      }
      return {
        id: chapter.id,
        bookId: chapter.bookId,
        title: chapter.title,
        order: chapter.order,
        contentLength: revision.contentLength,
        createdAt: chapter.createdAt,
        updatedAt: chapter.updatedAt,
        contentOffset,
        reachedEndAt,
        progressUpdatedAt: progress?.updatedAt ?? null,
      };
    });

    return {
      ...toListItem(book, inLibrary),
      canEdit: isOwner || (book.isOfficial && isContentStaff(user.role)),
      chapters,
      readingFraction:
        totalLength > 0 ? Math.min(1, totalOffset / totalLength) : 0,
      wordCount,
      readingMinutes: estimateReadingMinutes(wordCount),
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
    const contentRevision = revisionFromChapter(chapter);

    return {
      id: chapter.id,
      bookId: chapter.bookId,
      title: chapter.title,
      content: chapter.content,
      order: chapter.order,
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt,
      canEdit: isOwner || (book.isOfficial && isContentStaff(user.role)),
      bookTitle: book.title,
      contentRevision,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Livro não encontrado") {
      return null;
    }
    wrapError(error);
  }
}

async function readableChapter(user: User, chapterId: number) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
  });
  if (!chapter) {
    throw new Error("Capítulo não encontrado");
  }
  await getAccessibleBook(user, chapter.bookId);
  return chapter;
}

function clampProgressIndex(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function clampContentOffset(value: number | null | undefined, length: number) {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(Math.floor(value), Math.max(0, length)));
}

/**
 * Persiste o progresso do cliente sem remapar por `paginateReading`.
 * Mobile pagina por altura da tela; remapar por contagem de palavras
 * corrompia a posição (ex.: página 6 voltava como 3).
 *
 * PUT sem `contentOffset` (app antigo) zera o offset para não deixar
 * âncora velha; o app novo sempre envia offset + contentRevision.
 */
export async function getReadingProgress(
  chapterId: number
): Promise<ReadingPosition | null> {
  try {
    const user = await requireUser();
    const chapter = await readableChapter(user, chapterId);
    const contentRevision = revisionFromChapter(chapter);
    const stored = await prisma.readingProgress.findUnique({
      where: { userId_chapterId: { userId: user.id, chapterId } },
    });
    if (!stored) {
      return null;
    }
    return {
      pageIndex: clampProgressIndex(stored.pageIndex),
      paragraphIndex: clampProgressIndex(stored.paragraphIndex),
      contentOffset: clampContentOffset(
        stored.contentOffset,
        contentRevision.contentLength
      ),
      reachedEndAt: stored.reachedEndAt,
      contentRevision,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Livro não encontrado") {
      return null;
    }
    wrapError(error);
  }
}

export async function saveReadingProgress(
  chapterId: number,
  input: SaveReadingProgressInput
): Promise<ReadingPosition> {
  try {
    const user = await requireUser();
    const chapter = await readableChapter(user, chapterId);
    const contentRevision = revisionFromChapter(chapter);
    const pageIndex = clampProgressIndex(input.pageIndex);
    const paragraphIndex = clampProgressIndex(input.paragraphIndex);

    // App antigo: campo ausente → zera offset (não deixa âncora stale).
    const offsetProvided = Object.prototype.hasOwnProperty.call(
      input,
      "contentOffset"
    );
    let contentOffset: number | null = null;
    if (offsetProvided && input.contentOffset != null) {
      contentOffset = clampContentOffset(
        input.contentOffset,
        contentRevision.contentLength
      );
    }

    const existing = await prisma.readingProgress.findUnique({
      where: { userId_chapterId: { userId: user.id, chapterId } },
      select: { reachedEndAt: true },
    });

    const atEnd =
      contentOffset != null &&
      contentRevision.contentLength > 0 &&
      contentOffset >= contentRevision.contentLength;
    const reachedEndAt =
      atEnd && !existing?.reachedEndAt
        ? new Date()
        : existing?.reachedEndAt ?? null;

    await prisma.readingProgress.upsert({
      where: { userId_chapterId: { userId: user.id, chapterId } },
      create: {
        userId: user.id,
        chapterId,
        pageIndex,
        paragraphIndex,
        contentOffset,
        reachedEndAt,
      },
      update: {
        pageIndex,
        paragraphIndex,
        contentOffset,
        updatedAt: new Date(),
        ...(reachedEndAt && !existing?.reachedEndAt
          ? { reachedEndAt }
          : {}),
      },
    });

    return {
      pageIndex,
      paragraphIndex,
      contentOffset,
      reachedEndAt,
      contentRevision,
    };
  } catch (error) {
    wrapError(error);
  }
}
