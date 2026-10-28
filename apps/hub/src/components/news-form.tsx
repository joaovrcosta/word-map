"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { api, type HubNewsDetail } from "@/lib/api";

export function NewsForm({ newsId }: { newsId?: number }) {
  const router = useRouter();
  const [section, setSection] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [tags, setTags] = useState("");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(Boolean(newsId));

  function apply(article: HubNewsDetail) {
    setSection(article.section);
    setTitle(article.title);
    setSummary(article.summary);
    setBody(article.body);
    setImageUrl(article.imageUrl ?? "");
    setImageCaption(article.imageCaption ?? "");
    setTags(article.tags.join(", "));
    setPublishedAt(article.publishedAt);
  }

  useEffect(() => {
    if (!newsId) return;
    api<HubNewsDetail>("GET", `/hub/news/${newsId}`)
      .then(apply)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Notícia não encontrada")
      )
      .finally(() => setLoading(false));
  }, [newsId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const payload = {
      section,
      title,
      summary,
      body,
      imageUrl,
      imageCaption,
      tags,
    };
    try {
      if (newsId) {
        apply(await api<HubNewsDetail>("PATCH", `/hub/news/${newsId}`, payload));
      } else {
        const created = await api<HubNewsDetail>("POST", "/hub/news", payload);
        router.push(`/news/${created.id}`);
        return;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar.");
    } finally {
      setPending(false);
    }
  }

  async function publish(published: boolean) {
    if (!newsId) return;
    setError("");
    try {
      apply(await api<HubNewsDetail>("POST", `/hub/news/${newsId}/publish`, { published }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível publicar.");
    }
  }

  async function remove() {
    if (!newsId || !confirm("Excluir esta notícia?")) return;
    await api("DELETE", `/hub/news/${newsId}`);
    router.push("/news");
  }

  if (loading) return <p className="text-sm text-[#667085]">Carregando notícia...</p>;

  return (
    <div>
      <Link href="/news" className="text-sm font-extrabold text-[#14804a]">
        Voltar às notícias
      </Link>
      <form onSubmit={onSubmit} className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-extrabold">{newsId ? "Editar notícia" : "Nova notícia"}</h1>
          {newsId ? (
            <span
              className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                publishedAt ? "bg-[#e7f8ee] text-[#14804a]" : "bg-[#f2f4f7] text-[#667085]"
              }`}
            >
              {publishedAt ? "Publicada" : "Rascunho"}
            </span>
          ) : null}
        </div>

        <label className="mt-4 block text-sm font-bold" htmlFor="section">
          Seção / tema
        </label>
        <input
          id="section"
          required
          value={section}
          onChange={(event) => setSection(event.target.value)}
          placeholder="Ex.: Brazil's Presidential Election"
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />

        <label className="mt-4 block text-sm font-bold" htmlFor="title">
          Manchete
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />

        <label className="mt-4 block text-sm font-bold" htmlFor="tags">
          Tags (separadas por vírgula)
        </label>
        <input
          id="tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="Lula Wins, What to Know, Results"
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />

        <label className="mt-4 block text-sm font-bold" htmlFor="summary">
          Resumo
        </label>
        <textarea
          id="summary"
          required
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          className="mt-1 min-h-24 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />

        <label className="mt-4 block text-sm font-bold" htmlFor="imageUrl">
          URL da imagem
        </label>
        <input
          id="imageUrl"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="https://..."
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />

        <label className="mt-4 block text-sm font-bold" htmlFor="imageCaption">
          Legenda da imagem
        </label>
        <input
          id="imageCaption"
          value={imageCaption}
          onChange={(event) => setImageCaption(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />

        <label className="mt-4 block text-sm font-bold" htmlFor="body">
          Texto completo
        </label>
        <textarea
          id="body"
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="mt-1 min-h-64 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />

        {error && <p className="mt-3 text-sm text-[#b42318]">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-[#24c875] px-4 py-2 font-extrabold text-white disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar"}
          </button>
          {newsId ? (
            <>
              <button
                type="button"
                onClick={() => void publish(!publishedAt)}
                className="rounded-xl border border-[#d7dde5] px-4 py-2 font-extrabold"
              >
                {publishedAt ? "Despublicar" : "Publicar no app"}
              </button>
              <button type="button" onClick={() => void remove()} className="font-extrabold text-[#b42318]">
                Excluir
              </button>
            </>
          ) : null}
        </div>
      </form>
    </div>
  );
}
