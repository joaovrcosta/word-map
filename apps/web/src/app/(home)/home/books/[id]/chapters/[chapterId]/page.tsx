"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getChapterById,
  getReadingProgress,
  saveReadingProgress,
  updateChapter,
  type ReadingPosition,
} from "@/actions/books";
import type { Text } from "@/actions/actions";
import { TextViewer } from "@/app/(home)/home/texts/text-viewer";
import { useDebounce } from "@/hooks/use-debounce";

export default function ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = Number(params.id);
  const chapterId = Number(params.chapterId);
  const [text, setText] = useState<Text | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [bookTitle, setBookTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState<ReadingPosition>({
    pageIndex: 0,
    paragraphIndex: 0,
  });
  const [progressReady, setProgressReady] = useState(false);
  const [saveArmed, setSaveArmed] = useState(false);
  const debouncedPosition = useDebounce(position, 400);

  const loadChapter = useCallback(async () => {
    try {
      setIsLoading(true);
      const chapter = await getChapterById(chapterId);
      if (!chapter || chapter.bookId !== bookId) {
        setText(null);
        return;
      }

      setCanEdit(chapter.canEdit);
      setBookTitle(chapter.bookTitle);
      setText({
        id: chapter.id,
        title: chapter.title,
        content: chapter.content,
        userId: 0,
        createdAt: chapter.createdAt,
        updatedAt: chapter.updatedAt,
      });
    } catch {
      setText(null);
    } finally {
      setIsLoading(false);
    }
  }, [bookId, chapterId]);

  useEffect(() => {
    if (!Number.isFinite(chapterId) || !Number.isFinite(bookId)) return;
    loadChapter();
  }, [bookId, chapterId, loadChapter]);

  useEffect(() => {
    if (!Number.isFinite(chapterId)) return;
    let cancelled = false;
    setProgressReady(false);
    getReadingProgress(chapterId)
      .then((progress) => {
        if (cancelled) return;
        if (progress) setPosition(progress);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setProgressReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  useEffect(() => {
    if (!progressReady || saveArmed) return;
    if (
      debouncedPosition.pageIndex === position.pageIndex &&
      debouncedPosition.paragraphIndex === position.paragraphIndex
    ) {
      setSaveArmed(true);
    }
  }, [progressReady, saveArmed, debouncedPosition, position]);

  useEffect(() => {
    if (!saveArmed || !Number.isFinite(chapterId)) return;
    void saveReadingProgress(
      chapterId,
      debouncedPosition.pageIndex,
      debouncedPosition.paragraphIndex
    ).catch(() => undefined);
  }, [saveArmed, chapterId, debouncedPosition]);

  const handleReadingPosition = useCallback((next: ReadingPosition) => {
    setPosition((current) =>
      current.pageIndex === next.pageIndex &&
        current.paragraphIndex === next.paragraphIndex
        ? current
        : next
    );
  }, []);

  const handleSave = async (title: string, content: string) => {
    await updateChapter(chapterId, title, content);
  };

  if (isLoading || !progressReady) {
    return (
      <div className="fixed inset-0 z-40 bg-[#22272e] text-zinc-100">
        <div className="flex items-center gap-3 px-4 pb-2 pt-3">
          <Link
            href={`/home/books/${bookId}`}
            aria-label="Fechar"
            className="text-zinc-100"
          >
            <X className="size-6" strokeWidth={1.75} />
          </Link>
          <div className="h-1.5 flex-1 rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  if (!text) {
    return (
      <div className="px-8 py-12 text-center">
        <h1 className="text-2xl font-extrabold text-[#3c3c3c]">
          Capítulo não encontrado
        </h1>
        <Button className="mt-4" onClick={() => router.push("/home/books")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f6f7f9] dark:bg-gray-950">
      <div className="w-full pt-8">
        {progressReady && (
          <TextViewer
            text={text}
            canEdit={canEdit}
            onSave={handleSave}
            onTextUpdated={loadChapter}
            paged
            initialPageIndex={position.pageIndex}
            initialParagraphIndex={position.paragraphIndex}
            onReadingPosition={handleReadingPosition}
            sourceTitle={
              bookTitle ? `${bookTitle} · ${text.title}` : text.title
            }
            sourceKind="book"
          />
        )}
      </div>
    </div>
  );
}
