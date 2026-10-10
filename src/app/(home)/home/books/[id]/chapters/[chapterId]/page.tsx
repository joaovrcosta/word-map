"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getChapterById, updateChapter } from "@/actions/books";
import type { Text } from "@/actions/actions";
import { TextViewer } from "@/app/(home)/home/texts/text-viewer";

export default function ChapterPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = Number(params.id);
  const chapterId = Number(params.chapterId);
  const [text, setText] = useState<Text | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [bookTitle, setBookTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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

  const handleSave = async (title: string, content: string) => {
    await updateChapter(chapterId, title, content);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1cb0f6] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando capítulo...</p>
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
    <div className="min-h-full bg-white dark:bg-gray-950">
      <div className="w-full pt-6 pb-12">
        <div className="px-6 sm:px-8">
          <Button
            variant="ghost"
            onClick={() => router.push(`/home/books/${bookId}`)}
            className="mb-3 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {bookTitle || "Livro"}
          </Button>
        </div>
        <TextViewer
          text={text}
          canEdit={canEdit}
          onSave={handleSave}
          onTextUpdated={loadChapter}
        />
      </div>
    </div>
  );
}
