"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, writeAccessToken, type SessionUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await api<{
        success: boolean;
        user?: SessionUser;
        token?: string;
        error?: string;
      }>("POST", "/auth/login", { email, password });
      if (!result.success || !result.user) {
        setError(result.error || "Email ou senha inválidos");
        return;
      }
      if (result.user.role === "USER") {
        setError(
          "Esta conta ainda é de leitor. Um administrador precisa promover você a moderador."
        );
        return;
      }
      if (!result.token) {
        setError("Login ok, mas a API não devolveu token. Tente de novo.");
        return;
      }
      writeAccessToken(result.token);
      router.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm"
      >
        <p className="text-sm font-extrabold uppercase tracking-wide text-[#14804a]">
          Word Map
        </p>
        <h1 className="mt-2 text-3xl font-extrabold">Content Hub</h1>
        <p className="mt-2 text-sm text-[#667085]">
          Entre com uma conta de administrador ou moderador para publicar o conteúdo do site.
        </p>
        <label className="mt-6 block text-sm font-bold" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        <label className="mt-4 block text-sm font-bold" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-xl border border-[#d7dde5] px-3 py-2"
        />
        {error && (
          <p className="mt-4 rounded-xl bg-[#fff1f0] px-3 py-2 text-sm text-[#b42318]">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-xl bg-[#24c875] px-4 py-3 font-extrabold text-white disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
