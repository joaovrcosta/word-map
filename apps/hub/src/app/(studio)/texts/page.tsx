"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type HubText } from "@/lib/api";

export default function TextsPage() {
  const [texts, setTexts] = useState<HubText[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<HubText[]>("GET", "/hub/texts")
      .then(setTexts)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Erro ao carregar.")
      );
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Textos</h1>
          <p className="mt-2 text-sm text-[#667085]">
            Estes textos aparecem na aba Catálogo, prontos para leitura no site.
          </p>
        </div>
        <Link
          href="/texts/new"
          className="rounded-xl bg-[#24c875] px-4 py-2 font-extrabold text-white"
        >
          Novo texto
        </Link>
      </div>
      {error && <p className="mt-4 text-sm text-[#b42318]">{error}</p>}
      <ul className="mt-6 space-y-3">
        {texts.map((text) => (
          <li key={text.id}>
            <Link
              href={`/texts/${text.id}`}
              className="block rounded-3xl bg-white p-5 shadow-sm hover:ring-2 hover:ring-[#24c875]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-lg font-extrabold">{text.title}</p>
                {text.level && (
                  <span className="rounded-full bg-[#e7f8ee] px-2 py-1 text-xs font-extrabold text-[#14804a]">
                    {text.level}
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-[#667085]">
                {text.summary || text.content}
              </p>
            </Link>
          </li>
        ))}
        {texts.length === 0 && !error && (
          <li className="rounded-3xl bg-white p-5 text-sm text-[#667085] shadow-sm">
            Nenhum texto publicado no catálogo.
          </li>
        )}
      </ul>
    </div>
  );
}
