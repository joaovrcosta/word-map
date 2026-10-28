"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api, type HubStory } from "@/lib/api";

export default function StoriesPage() {
  const router = useRouter();
  const [stories, setStories] = useState<HubStory[]>([]);
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function load() {
    api<HubStory[]>("GET", "/hub/stories")
      .then(setStories)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Erro ao carregar."));
  }

  useEffect(load, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const story = await api<{ id: number }>("POST", "/hub/stories", { title, theme });
      router.push(`/stories/${story.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar.");
      setPending(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Histórias</h1>
      <p className="mt-2 text-sm text-[#667085]">
        Uma história publicada aparece na seção Histórias do app. Ela começa como rascunho.
      </p>

      <form onSubmit={onSubmit} className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-extrabold">Nova história</h2>
        <label className="mt-4 block text-sm font-bold" htmlFor="story-title">
          Título
        </label>
        <input
          id="story-title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        <label className="mt-4 block text-sm font-bold" htmlFor="story-theme">
          Tema
        </label>
        <input
          id="story-theme"
          required
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        {error && <p className="mt-3 text-sm text-[#b42318]">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-xl bg-[#24c875] px-4 py-2 font-extrabold text-white disabled:opacity-60"
        >
          {pending ? "Criando..." : "Criar rascunho"}
        </button>
      </form>

      <ul className="mt-6 space-y-3">
        {stories.map((story) => (
          <li key={story.id}>
            <Link
              href={`/stories/${story.id}`}
              className="block rounded-3xl bg-white p-5 shadow-sm hover:ring-2 hover:ring-[#24c875]"
            >
              <p className="text-lg font-extrabold">{story.title}</p>
              <p className="mt-1 text-sm text-[#667085]">{story.theme}</p>
              <p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-[#98a2b3]">
                {story.publishedAt ? "Publicada" : "Rascunho"} · {story.stepCount} fala
                {story.stepCount === 1 ? "" : "s"}
                {story.bookTitle ? ` · ${story.bookTitle}` : ""}
              </p>
            </Link>
          </li>
        ))}
        {stories.length === 0 && (
          <li className="rounded-3xl bg-white p-5 text-sm text-[#667085] shadow-sm">
            Nenhuma história cadastrada.
          </li>
        )}
      </ul>
    </div>
  );
}
