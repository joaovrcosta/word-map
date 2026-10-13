import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  addBookToLibrary,
  addChapter,
  createBook,
  createOfficialBook,
  deleteBook,
  deleteChapter,
  getBookById,
  getChapterById,
  getReadingProgress,
  listLibraryBooks,
  listMyBooks,
  listOfficialBooks,
  removeFromLibrary,
  reorderChapters,
  saveReadingProgress,
  updateBook,
  updateChapter,
} from "../domain/books";

@Injectable()
export class BooksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findOwned(userId: number, bookId: number) {
    return this.prisma.book.findFirst({ where: { id: bookId, ownerId: userId } });
  }
}

@Injectable()
export class BooksService {
  constructor(private readonly books: BooksRepository) {}

  create(title: string, description?: string) {
    return createBook(title, description);
  }

  createOfficial(title: string, description?: string) {
    return createOfficialBook(title, description);
  }

  update(bookId: number, title: string, description?: string) {
    return updateBook(bookId, title, description);
  }

  remove(bookId: number) {
    return deleteBook(bookId);
  }

  official() {
    return listOfficialBooks();
  }

  mine() {
    return listMyBooks();
  }

  library() {
    return listLibraryBooks();
  }

  addLibrary(bookId: number) {
    return addBookToLibrary(bookId);
  }

  removeLibrary(bookId: number) {
    return removeFromLibrary(bookId);
  }

  addChapter(bookId: number, title: string, content: string) {
    return addChapter(bookId, title, content);
  }

  updateChapter(chapterId: number, title: string, content: string) {
    return updateChapter(chapterId, title, content);
  }

  deleteChapter(chapterId: number) {
    return deleteChapter(chapterId);
  }

  reorder(bookId: number, chapterIds: number[]) {
    return reorderChapters(bookId, chapterIds);
  }

  get(bookId: number) {
    return getBookById(bookId);
  }

  chapter(chapterId: number) {
    return getChapterById(chapterId);
  }

  progress(chapterId: number) {
    return getReadingProgress(chapterId);
  }

  saveProgress(chapterId: number, pageIndex: number, paragraphIndex: number) {
    return saveReadingProgress(chapterId, pageIndex, paragraphIndex);
  }
}
