"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, webOrigin, type HubBook, type HubText } from "@/lib/api";
import { useSession } from "@/lib/session";

export default function DashboardPage() {
  const user = useSession();
  const [books, setBooks] = useState<HubBook[]>([]);
  const [texts, setTexts] = useState<HubText[]>([]);

  useEffect(() => {
    api<HubBook[]>("GET", "/hub/books").then(setBooks).catch(() => setBooks([]));
    api<HubText[]>("GET", "/hub/texts").then(setTexts).catch(() => setTexts([]));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-extrabold">Olá, {user.name.split(" ")[0]}</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#667085]">
        Livros publicados aqui entram na loja do site. Textos publicados entram no catálogo de leitura.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link href="/books" className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-[#667085]">Livros oficiais</p>
          <p className="mt-2 text-4xl font-extrabold">{books.length}</p>
        </Link>
        <Link href="/texts" className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-bold text-[#667085]">Textos do catálogo</p>
          <p className="mt-2 text-4xl font-extrabold">{texts.length}</p>
        </Link>
      </div>
      <a
        href={`${webOrigin()}/home/books`}
        className="mt-6 inline-block text-sm font-extrabold text-[#14804a]"
      >
        Ver a loja no site
      </a>
    </div>
  );
}
