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

export type ReadingPosition = {
  pageIndex: number;
  paragraphIndex: number;
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

import { browserApi } from "@/lib/api/resources";

export const createBook = browserApi.createBook as (
  title: string,
  description?: string
) => Promise<BookListItem>;
export const createOfficialBook = browserApi.createOfficialBook as (
  title: string,
  description?: string
) => Promise<BookListItem>;
export const updateBook = browserApi.updateBook as (
  bookId: number,
  title: string,
  description?: string
) => Promise<BookListItem>;
export const deleteBook = browserApi.deleteBook as (bookId: number) => Promise<void>;
export const listOfficialBooks = browserApi.listOfficialBooks as () => Promise<
  BookListItem[]
>;
export const listMyBooks = browserApi.listMyBooks as () => Promise<BookListItem[]>;
export const listLibraryBooks = browserApi.listLibraryBooks as () => Promise<
  BookListItem[]
>;
export const addBookToLibrary = browserApi.addBookToLibrary;
export const removeFromLibrary = browserApi.removeFromLibrary;
export const addChapter = browserApi.addChapter;
export const updateChapter = browserApi.updateChapter;
export const deleteChapter = browserApi.deleteChapter;
export const reorderChapters = browserApi.reorderChapters;
export const getBookById = browserApi.getBookById as (
  bookId: number
) => Promise<BookDetail | null>;
export const getChapterById = browserApi.getChapterById as (
  chapterId: number
) => Promise<ChapterDetail | null>;
export const getReadingProgress = browserApi.getReadingProgress;
export const saveReadingProgress = browserApi.saveReadingProgress;
