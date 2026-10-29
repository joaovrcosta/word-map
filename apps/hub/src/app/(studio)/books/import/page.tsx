"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { countWords } from "@word-map/shared";
import { api } from "@/lib/api";
import {
  chapterStats,
  importPdfFile,
  type ImportedChapter,
} from "@/lib/pdf-text";

export default function ImportBookPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [chapters, setChapters] = useState<ImportedChapter[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState("");

  const stats = useMemo(() => chapterStats(chapters), [chapters]);

  async function onFile(file: File | null) {
    if (!file) return;
    setError("");
    setParsing(true);
    setChapters([]);
    setPageCount(0);
    try {
      const draft = await importPdfFile(file);
      if (draft.chapters.length === 0) {
        throw new Error(
          "Não achei texto selecionável neste PDF. PDFs só imagem precisam de OCR (ainda não suportado)."
        );
      }
      setTitle(draft.suggestedTitle);
      setPageCount(draft.pageCount);
      setChapters(draft.chapters);
      setOpenIndex(0);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível ler o PDF."
      );
    } finally {
      setParsing(false);
    }
  }

  function updateChapter(index: number, patch: Partial<ImportedChapter>) {
    setChapters((current) =>
      current.map((chapter, i) => (i === index ? { ...chapter, ...patch } : chapter))
    );
  }

  function removeChapter(index: number) {
    setChapters((current) => current.filter((_, i) => i !== index));
    setOpenIndex(null);
  }

  async function onPublish(event: FormEvent) {
    event.preventDefault();
    if (chapters.length === 0) {
      setError("Importe um PDF com pelo menos um capítulo.");
      return;
    }
    setPublishing(true);
    setError("");
    setProgress("Criando livro...");
    try {
      const book = await api<{ id: number }>("POST", "/hub/books", {
        title: title.trim(),
        description: description.trim() || undefined,
        coverUrl: coverUrl.trim() || undefined,
      });
      for (let i = 0; i < chapters.length; i += 1) {
        const chapter = chapters[i]!;
        setProgress(`Publicando capítulo ${i + 1}/${chapters.length}...`);
        await api("POST", `/hub/books/${book.id}/chapters`, {
          title: chapter.title.trim() || `Capítulo ${i + 1}`,
          content: chapter.content,
        });
      }
      router.push(`/books/${book.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível publicar."
      );
      setPublishing(false);
      setProgress("");
    }
  }

  return (
    <div>
      <Link href="/books" className="text-sm font-extrabold text-[#14804a]">
        Voltar aos livros
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold">Importar PDF</h1>
      <p className="mt-2 text-sm text-[#667085]">
        Extrai o texto do PDF no navegador, limpa quebras tipográficas e detecta
        capítulos por títulos como &quot;Chapter 1&quot; — sem IA e sem OCR.
      </p>

      <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
        <label className="block text-sm font-bold" htmlFor="pdf-file">
          Arquivo PDF
        </label>
        <input
          id="pdf-file"
          type="file"
          accept="application/pdf,.pdf"
          disabled={parsing || publishing}
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
          className="mt-2 block w-full text-sm"
        />
        {parsing && (
          <p className="mt-3 text-sm font-bold text-[#667085]">Lendo PDF...</p>
        )}
        {pageCount > 0 && (
          <p className="mt-3 text-sm text-[#667085]">
            {pageCount} página{pageCount === 1 ? "" : "s"} · {stats.chapterCount}{" "}
            capítulo{stats.chapterCount === 1 ? "" : "s"} · ~{stats.words.toLocaleString("pt-BR")}{" "}
            palavras
          </p>
        )}
      </div>

      {chapters.length > 0 && (
        <form onSubmit={onPublish} className="mt-6 space-y-4">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="font-extrabold">Metadados</h2>
            <label className="mt-4 block text-sm font-bold" htmlFor="import-title">
              Título
            </label>
            <input
              id="import-title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
            />
            <label className="mt-4 block text-sm font-bold" htmlFor="import-description">
              Descrição
            </label>
            <textarea
              id="import-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 min-h-24 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
            />
            <label className="mt-4 block text-sm font-bold" htmlFor="import-cover">
              URL da capa
            </label>
            <input
              id="import-cover"
              type="url"
              value={coverUrl}
              onChange={(event) => setCoverUrl(event.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
            />
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="font-extrabold">Capítulos detectados</h2>
            <p className="mt-1 text-sm text-[#667085]">
              Revise títulos e remova o que não servir antes de publicar.
            </p>
            <ul className="mt-4 space-y-3">
              {chapters.map((chapter, index) => {
                const words = countWords(chapter.content);
                const open = openIndex === index;
                return (
                  <li
                    key={`${chapter.title}-${index}`}
                    className="rounded-2xl border border-[#e8edf3] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={chapter.title}
                        onChange={(event) =>
                          updateChapter(index, { title: event.target.value })
                        }
                        className="min-w-0 flex-1 rounded-xl border border-[#d7dde5] px-3 py-2 text-sm font-bold"
                      />
                      <span className="text-xs font-extrabold uppercase tracking-wide text-[#98a2b3]">
                        {words.toLocaleString("pt-BR")} palavras
                      </span>
                      <button
                        type="button"
                        onClick={() => setOpenIndex(open ? null : index)}
                        className="text-sm font-bold text-[#14804a]"
                      >
                        {open ? "Fechar" : "Preview"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeChapter(index)}
                        className="text-sm font-bold text-[#b42318]"
                      >
                        Remover
                      </button>
                    </div>
                    {open && (
                      <textarea
                        value={chapter.content}
                        onChange={(event) =>
                          updateChapter(index, { content: event.target.value })
                        }
                        className="mt-3 min-h-48 w-full rounded-xl border border-[#d7dde5] px-3 py-2 font-mono text-xs leading-relaxed"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {error && <p className="text-sm text-[#b42318]">{error}</p>}
          {progress && (
            <p className="text-sm font-bold text-[#667085]">{progress}</p>
          )}
          <button
            type="submit"
            disabled={publishing}
            className="rounded-xl bg-[#24c875] px-4 py-3 font-extrabold text-white disabled:opacity-60"
          >
            {publishing ? "Publicando..." : "Publicar livro importado"}
          </button>
        </form>
      )}

      {!chapters.length && error && (
        <p className="mt-4 text-sm text-[#b42318]">{error}</p>
      )}
    </div>
  );
}
