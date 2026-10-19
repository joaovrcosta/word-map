"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api, type HubBookDetail, type HubChapter } from "@/lib/api";

export default function BookEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bookId = Number(params.id);
  const [book, setBook] = useState<HubBookDetail | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  function apply(next: HubBookDetail) {
    setBook(next);
    setTitle(next.title);
    setDescription(next.description ?? "");
  }

  function load() {
    api<HubBookDetail>("GET", `/hub/books/${bookId}`)
      .then(apply)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Livro não encontrado")
      );
  }

  useEffect(load, [bookId]);

  async function saveBook(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("PATCH", `/hub/books/${bookId}`, { title, description });
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar.");
    }
  }

  async function removeBook() {
    if (!confirm("Excluir este livro oficial da loja?")) return;
    await api("DELETE", `/hub/books/${bookId}`);
    router.push("/books");
  }

  async function addChapter(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("POST", `/hub/books/${bookId}/chapters`, {
        title: chapterTitle,
        content: chapterContent,
      });
      setChapterTitle("");
      setChapterContent("");
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível adicionar.");
    }
  }

  async function saveChapter(chapter: HubChapter, nextTitle: string, nextContent: string) {
    await api("PATCH", `/hub/chapters/${chapter.id}`, {
      title: nextTitle,
      content: nextContent,
    });
    load();
  }

  async function removeChapter(chapterId: number) {
    if (!confirm("Excluir este capítulo?")) return;
    await api("DELETE", `/hub/chapters/${chapterId}`);
    load();
  }

  async function move(index: number, direction: -1 | 1) {
    if (!book) return;
    const next = book.chapters.slice();
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    await api("POST", `/hub/books/${bookId}/chapters/reorder`, {
      chapterIds: next.map((chapter) => chapter.id),
    });
    load();
  }

  if (!book) {
    return <p className="text-sm text-[#667085]">{error || "Carregando livro..."}</p>;
  }

  return (
    <div>
      <Link href="/books" className="text-sm font-extrabold text-[#14804a]">
        Voltar aos livros
      </Link>
      <form onSubmit={saveBook} className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <label className="block text-sm font-bold" htmlFor="title">
          Título
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        <label className="mt-4 block text-sm font-bold" htmlFor="description">
          Descrição
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="mt-1 min-h-24 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="submit" className="rounded-xl bg-[#24c875] px-4 py-2 font-extrabold text-white">
            Salvar livro
          </button>
          <button
            type="button"
            onClick={removeBook}
            className="rounded-xl px-4 py-2 font-extrabold text-[#b42318]"
          >
            Excluir
          </button>
        </div>
      </form>

      <section className="mt-6 space-y-3">
        <h2 className="text-xl font-extrabold">Capítulos</h2>
        {book.chapters.map((chapter, index) => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            open={openId === chapter.id}
            onToggle={() => setOpenId(openId === chapter.id ? null : chapter.id)}
            onSave={saveChapter}
            onDelete={() => removeChapter(chapter.id)}
            onUp={() => move(index, -1)}
            onDown={() => move(index, 1)}
            disableUp={index === 0}
            disableDown={index === book.chapters.length - 1}
          />
        ))}
      </section>

      <form onSubmit={addChapter} className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-extrabold">Novo capítulo</h2>
        <label className="mt-4 block text-sm font-bold" htmlFor="chapter-title">
          Título
        </label>
        <input
          id="chapter-title"
          required
          value={chapterTitle}
          onChange={(event) => setChapterTitle(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        <label className="mt-4 block text-sm font-bold" htmlFor="chapter-content">
          Texto
        </label>
        <textarea
          id="chapter-content"
          required
          value={chapterContent}
          onChange={(event) => setChapterContent(event.target.value)}
          className="mt-1 min-h-40 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        {error && <p className="mt-3 text-sm text-[#b42318]">{error}</p>}
        <button type="submit" className="mt-4 rounded-xl bg-[#17202a] px-4 py-2 font-extrabold text-white">
          Adicionar capítulo
        </button>
      </form>
    </div>
  );
}

function ChapterCard({
  chapter,
  open,
  onToggle,
  onSave,
  onDelete,
  onUp,
  onDown,
  disableUp,
  disableDown,
}: {
  chapter: HubChapter;
  open: boolean;
  onToggle: () => void;
  onSave: (chapter: HubChapter, title: string, content: string) => Promise<void>;
  onDelete: () => void;
  onUp: () => void;
  onDown: () => void;
  disableUp: boolean;
  disableDown: boolean;
}) {
  const [title, setTitle] = useState(chapter.title);
  const [content, setContent] = useState(chapter.content);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setTitle(chapter.title);
    setContent(chapter.content);
  }, [chapter.title, chapter.content]);

  return (
    <article className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onToggle} className="text-left font-extrabold">
          {chapter.title}
        </button>
        <div className="flex gap-2 text-sm font-bold">
          <button type="button" onClick={onUp} disabled={disableUp} className="disabled:opacity-30">
            Subir
          </button>
          <button type="button" onClick={onDown} disabled={disableDown} className="disabled:opacity-30">
            Descer
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-4">
          <label className="block text-sm font-bold" htmlFor={`chapter-${chapter.id}-title`}>
            Título
          </label>
          <input
            id={`chapter-${chapter.id}-title`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
          />
          <label className="mt-4 block text-sm font-bold" htmlFor={`chapter-${chapter.id}-content`}>
            Texto
          </label>
          <textarea
            id={`chapter-${chapter.id}-content`}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="mt-1 min-h-40 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
          />
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await onSave(chapter, title, content);
                } finally {
                  setPending(false);
                }
              }}
              className="rounded-xl bg-[#24c875] px-4 py-2 font-extrabold text-white"
            >
              {pending ? "Salvando..." : "Salvar capítulo"}
            </button>
            <button type="button" onClick={onDelete} className="font-extrabold text-[#b42318]">
              Excluir
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
