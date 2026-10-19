export type Role = "USER" | "MODERATOR" | "ADMIN";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export type HubBook = {
  id: number;
  title: string;
  description: string | null;
  chapterCount: number;
  updatedAt: string;
};

export type HubChapter = {
  id: number;
  title: string;
  content: string;
  order: number;
};

export type HubBookDetail = {
  id: number;
  title: string;
  description: string | null;
  chapters: HubChapter[];
};

export type HubText = {
  id: number;
  title: string;
  content: string;
  summary: string | null;
  level: string | null;
  updatedAt: string;
};

export type StaffMember = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const webOrigin = () =>
  process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

function readError(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Não foi possível concluir a ação.";
  }
  const body = payload as { error?: unknown; message?: unknown };
  if (
    typeof body.error === "string" &&
    body.error !== "Bad Request" &&
    body.error !== "Forbidden"
  ) {
    return body.error;
  }
  if (typeof body.message === "string") return body.message;
  if (Array.isArray(body.message)) return body.message.map(String).join(" ");
  return "Não foi possível concluir a ação.";
}

export async function api<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    method,
    credentials: "include",
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(readError(payload));
  return payload as T;
}

export function roleLabel(role: Role) {
  if (role === "ADMIN") return "Administrador";
  if (role === "MODERATOR") return "Moderador";
  return "Leitor";
}
