"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api, type HubBook } from "@/lib/api";

export default function BooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<HubBook[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function load() {
    api<HubBook[]>("GET", "/hub/books")
      .then(setBooks)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Erro ao carregar."));
  }

  useEffect(load, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const book = await api<{ id: number }>("POST", "/hub/books", {
        title,
        description,
      });
      router.push(`/books/${book.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível publicar.");
      setPending(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Livros</h1>
      <p className="mt-2 text-sm text-[#667085]">
        Um livro oficial fica disponível na loja para os leitores adicionarem à biblioteca.
      </p>

      <form onSubmit={onSubmit} className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-extrabold">Novo livro</h2>
        <label className="mt-4 block text-sm font-bold" htmlFor="book-title">
          Título
        </label>
        <input
          id="book-title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        <label className="mt-4 block text-sm font-bold" htmlFor="book-description">
          Descrição
        </label>
        <textarea
          id="book-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="mt-1 min-h-24 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        {error && <p className="mt-3 text-sm text-[#b42318]">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-xl bg-[#24c875] px-4 py-2 font-extrabold text-white disabled:opacity-60"
        >
          {pending ? "Publicando..." : "Publicar livro"}
        </button>
      </form>

      <ul className="mt-6 space-y-3">
        {books.map((book) => (
          <li key={book.id}>
            <Link
              href={`/books/${book.id}`}
              className="block rounded-3xl bg-white p-5 shadow-sm hover:ring-2 hover:ring-[#24c875]"
            >
              <p className="text-lg font-extrabold">{book.title}</p>
              {book.description && (
                <p className="mt-1 line-clamp-2 text-sm text-[#667085]">{book.description}</p>
              )}
              <p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-[#98a2b3]">
                {book.chapterCount} capítulo{book.chapterCount === 1 ? "" : "s"}
              </p>
            </Link>
          </li>
        ))}
        {books.length === 0 && (
          <li className="rounded-3xl bg-white p-5 text-sm text-[#667085] shadow-sm">
            Nenhum livro oficial publicado.
          </li>
        )}
      </ul>
    </div>
  );
}
