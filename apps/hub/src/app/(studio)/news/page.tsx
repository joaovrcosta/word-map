"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type HubNews } from "@/lib/api";

export default function NewsPage() {
  const [articles, setArticles] = useState<HubNews[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<HubNews[]>("GET", "/hub/news")
      .then(setArticles)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Erro ao carregar.")
      );
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Notícias</h1>
          <p className="mt-2 text-sm text-[#667085]">
            Notícias publicadas aparecem na seção Notícias do app, com layout editorial.
          </p>
        </div>
        <Link
          href="/news/new"
          className="rounded-xl bg-[#24c875] px-4 py-2 font-extrabold text-white"
        >
          Nova notícia
        </Link>
      </div>
      {error && <p className="mt-4 text-sm text-[#b42318]">{error}</p>}
      <ul className="mt-6 space-y-3">
        {articles.map((article) => (
          <li key={article.id}>
            <Link
              href={`/news/${article.id}`}
              className="block rounded-3xl bg-white p-5 shadow-sm hover:ring-2 hover:ring-[#24c875]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#667085]">
                    {article.section}
                  </p>
                  <p className="mt-1 text-lg font-extrabold">{article.title}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-xs font-extrabold ${
                    article.publishedAt
                      ? "bg-[#e7f8ee] text-[#14804a]"
                      : "bg-[#f2f4f7] text-[#667085]"
                  }`}
                >
                  {article.publishedAt ? "Publicada" : "Rascunho"}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-[#667085]">{article.summary}</p>
            </Link>
          </li>
        ))}
        {articles.length === 0 && !error && (
          <li className="rounded-3xl bg-white p-5 text-sm text-[#667085] shadow-sm">
            Nenhuma notícia ainda.
          </li>
        )}
      </ul>
    </div>
  );
}
