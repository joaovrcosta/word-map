"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteChapter,
  getBookById,
  type BookDetail,
} from "@/actions/books";
import { CreateChapterForm } from "../create-chapter-form";

export default function BookPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = Number(params.id);
  const [book, setBook] = useState<BookDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const loadBook = async () => {
    try {
      setIsLoading(true);
      const data = await getBookById(bookId);
      setBook(data);
    } catch {
      setBook(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(bookId)) return;
    loadBook();
  }, [bookId]);

  const handleDeleteChapter = async (chapterId: number) => {
    if (!confirm("Excluir este capítulo?")) return;
    try {
      await deleteChapter(chapterId);
      await loadBook();
    } catch {
      alert("Não foi possível excluir o capítulo.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1cb0f6] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando livro...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="px-8 py-12 text-center">
        <h1 className="text-2xl font-extrabold text-[#3c3c3c]">
          Livro não encontrado
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
      <div className="px-8 pt-5 pb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/home/books")}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Livros
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#1cb0f6]">
              {book.isOfficial ? "Livro oficial" : "Meu livro"}
            </p>
            <h1 className="mt-1 text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
              {book.title}
            </h1>
            {book.description && (
              <p className="mt-2 max-w-2xl text-[#777]">{book.description}</p>
            )}
          </div>
          {book.canEdit && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={20} className="mr-2" />
              Novo capítulo
            </Button>
          )}
        </div>

        <ol className="mt-10 space-y-4">
          {book.chapters.length === 0 ? (
            <li className="rounded-2xl border-2 border-dashed border-[#e5e5e5] p-8 text-center text-[#777]">
              {book.canEdit
                ? "Este livro ainda não tem capítulos. Crie o primeiro."
                : "Este livro ainda não tem capítulos."}
            </li>
          ) : (
            book.chapters.map((chapter, index) => (
              <li
                key={chapter.id}
                className="flex items-center justify-between gap-4 rounded-2xl border-2 border-[#e5e5e5] px-5 py-4 hover:border-[#1cb0f6]/40"
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() =>
                    router.push(
                      `/home/books/${book.id}/chapters/${chapter.id}`
                    )
                  }
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#ddf4ff] text-sm font-extrabold text-[#1cb0f6]">
                    {index + 1}
                  </span>
                  <span className="truncate text-[16px] font-extrabold text-[#3c3c3c]">
                    {chapter.title}
                  </span>
                </button>
                {book.canEdit && (
                  <button
                    type="button"
                    className="size-8 rounded-full text-red-500 hover:bg-red-50"
                    onClick={() => handleDeleteChapter(chapter.id)}
                    aria-label="Excluir capítulo"
                  >
                    <Trash2 size={16} className="mx-auto" />
                  </button>
                )}
              </li>
            ))
          )}
        </ol>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Novo capítulo</DialogTitle>
          </DialogHeader>
          <CreateChapterForm
            bookId={book.id}
            onSuccess={(chapterId) => {
              setCreateOpen(false);
              router.push(`/home/books/${book.id}/chapters/${chapterId}`);
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
