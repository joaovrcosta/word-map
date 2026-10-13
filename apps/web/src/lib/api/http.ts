export const apiBase = () =>
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type ApiInit = RequestInit & { cookie?: string };

function revive(value: unknown): unknown {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, revive(item)])
    );
  }
  return value;
}

export async function apiRequest<T = any>(
  method: string,
  path: string,
  body?: unknown,
  init?: ApiInit
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (init?.cookie) headers.set("cookie", init.cookie);

  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? revive(JSON.parse(text)) : null;
  if (!response.ok) {
    const error =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error)
        : "Erro na API";
    throw new Error(error);
  }
  return payload as T;
}
