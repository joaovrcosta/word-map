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
  coverUrl: string | null;
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
  coverUrl: string | null;
  chapters: HubChapter[];
};

export type HubStory = {
  id: number;
  title: string;
  theme: string;
  bookTitle: string | null;
  stepCount: number;
  publishedAt: string | null;
  updatedAt: string;
};

export type HubStoryOption = {
  id: number;
  text: string;
  correct: boolean;
};

export type HubStoryChallenge = {
  id: number;
  kind: "TRUE_FALSE" | "CHOICE";
  prompt: string;
  correct: boolean | null;
  options: HubStoryOption[];
};

export type HubStoryStep = {
  id: number;
  order: number;
  speaker: string | null;
  text: string;
  translation: string;
  challenge: HubStoryChallenge | null;
};

export type HubStoryDetail = {
  id: number;
  title: string;
  theme: string;
  bookId: number | null;
  bookTitle: string | null;
  publishedAt: string | null;
  steps: HubStoryStep[];
};

export type HubText = {
  id: number;
  title: string;
  content: string;
  summary: string | null;
  level: string | null;
  updatedAt: string;
};

export type HubNews = {
  id: number;
  section: string;
  title: string;
  summary: string;
  publishedAt: string | null;
  updatedAt: string;
  tagCount: number;
};

export type HubNewsDetail = {
  id: number;
  section: string;
  title: string;
  summary: string;
  body: string;
  imageUrl: string | null;
  imageCaption: string | null;
  tags: string[];
  publishedAt: string | null;
  updatedAt: string;
  listenSeconds: number;
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

const TOKEN_KEY = "wordmap-hub-token";

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
}

export function readAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function writeAccessToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  window.localStorage.removeItem(TOKEN_KEY);
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
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  const token = readAccessToken();
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`${apiBase()}${path}`, {
    method,
    credentials: "include",
    headers,
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
