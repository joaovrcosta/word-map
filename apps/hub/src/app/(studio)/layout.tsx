"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  api,
  clearAccessToken,
  roleLabel,
  webOrigin,
  type SessionUser,
} from "@/lib/api";
import { SessionProvider } from "@/lib/session";

const links = [
  { href: "/", label: "Início" },
  { href: "/books", label: "Livros" },
  { href: "/stories", label: "Histórias" },
  { href: "/news", label: "Notícias" },
  { href: "/texts", label: "Textos" },
];

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    api<{ user: SessionUser | null }>("GET", "/auth/me")
      .then((result) => setUser(result.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user === null) {
      clearAccessToken();
      router.replace("/login");
    }
  }, [router, user]);

  if (user === undefined || user === null) {
    return (
      <main className="grid min-h-screen place-items-center text-sm font-bold text-[#667085]">
        Carregando o hub...
      </main>
    );
  }

  if (user.role === "USER") {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-extrabold">Acesso da equipe</h1>
          <p className="mt-3 text-sm text-[#667085]">
            Sua conta é de leitor. Um administrador pode promover você a moderador para publicar livros e textos.
          </p>
          <a
            href={webOrigin()}
            className="mt-6 inline-block rounded-xl bg-[#24c875] px-4 py-3 font-extrabold text-white"
          >
            Voltar ao site
          </a>
        </div>
      </main>
    );
  }

  async function logout() {
    try {
      await api("POST", "/auth/logout");
    } finally {
      clearAccessToken();
      router.replace("/login");
    }
  }

  return (
    <SessionProvider user={user}>
      <div className="min-h-screen md:grid md:h-screen md:grid-cols-[240px_1fr] md:overflow-hidden">
        <aside className="flex flex-col bg-[#17202a] text-white md:h-full md:overflow-y-auto">
          <div className="px-5 py-6">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[#7ddea8]">
              Word Map
            </p>
            <p className="text-xl font-extrabold">Content Hub</p>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 pb-4 md:block md:flex-1 md:space-y-1 md:overflow-y-auto md:px-3">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-xl px-3 py-2 text-sm font-bold ${
                    active ? "bg-white/10 text-white" : "text-[#c5ced6]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            {user.role === "ADMIN" && (
              <Link
                href="/team"
                className={`block rounded-xl px-3 py-2 text-sm font-bold ${
                  pathname.startsWith("/team")
                    ? "bg-white/10 text-white"
                    : "text-[#c5ced6]"
                }`}
              >
                Equipe
              </Link>
            )}
          </nav>
          <div className="mt-auto hidden border-t border-white/10 px-5 py-5 md:block">
            <p className="text-sm font-extrabold">{user.name}</p>
            <p className="text-xs text-[#9aa6b2]">{roleLabel(user.role)}</p>
            <button
              type="button"
              onClick={() => void logout()}
              className="mt-4 w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm font-extrabold text-white hover:bg-white/15"
            >
              Deslogar
            </button>
          </div>
        </aside>
        <div className="min-w-0 md:h-full md:overflow-y-auto">
          <div className="flex items-center justify-between gap-3 border-b border-[#e8edf3] bg-white px-4 py-3 md:hidden">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold">{user.name}</p>
              <p className="text-xs text-[#667085]">{roleLabel(user.role)}</p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="shrink-0 rounded-xl bg-[#17202a] px-3 py-2 text-sm font-extrabold text-white"
            >
              Deslogar
            </button>
          </div>
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</div>
        </div>
      </div>
    </SessionProvider>
  );
}
