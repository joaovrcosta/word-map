"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { LEVELS, api, type HubText } from "@/lib/api";

export function TextForm({ textId }: { textId?: number }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [level, setLevel] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(Boolean(textId));

  useEffect(() => {
    if (!textId) return;
    api<HubText>("GET", `/hub/texts/${textId}`)
      .then((text) => {
        setTitle(text.title);
        setSummary(text.summary ?? "");
        setLevel(text.level ?? "");
        setContent(text.content);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Texto não encontrado")
      )
      .finally(() => setLoading(false));
  }, [textId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const body = { title, summary, level, content };
    try {
      if (textId) {
        await api("PATCH", `/hub/texts/${textId}`, body);
        router.push("/texts");
      } else {
        const created = await api<HubText>("POST", "/hub/texts", body);
        router.push(`/texts/${created.id}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar.");
      setPending(false);
    }
  }

  async function remove() {
    if (!textId || !confirm("Tirar este texto do catálogo?")) return;
    await api("DELETE", `/hub/texts/${textId}`);
    router.push("/texts");
  }

  if (loading) return <p className="text-sm text-[#667085]">Carregando texto...</p>;

  return (
    <div>
      <Link href="/texts" className="text-sm font-extrabold text-[#14804a]">
        Voltar aos textos
      </Link>
      <form onSubmit={onSubmit} className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-extrabold">
          {textId ? "Editar texto" : "Novo texto"}
        </h1>
        <label className="mt-4 block text-sm font-bold" htmlFor="title">
          Título
        </label>
        <input
          id="title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        <label className="mt-4 block text-sm font-bold" htmlFor="level">
          Nível
        </label>
        <select
          id="level"
          value={level}
          onChange={(event) => setLevel(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        >
          <option value="">Sem nível</option>
          {LEVELS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <label className="mt-4 block text-sm font-bold" htmlFor="summary">
          Resumo
        </label>
        <textarea
          id="summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          className="mt-1 min-h-20 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        <label className="mt-4 block text-sm font-bold" htmlFor="content">
          Texto
        </label>
        <textarea
          id="content"
          required
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="mt-1 min-h-64 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        {error && <p className="mt-3 text-sm text-[#b42318]">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-[#24c875] px-4 py-2 font-extrabold text-white disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Publicar no catálogo"}
          </button>
          {textId && (
            <button type="button" onClick={remove} className="font-extrabold text-[#b42318]">
              Excluir
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
