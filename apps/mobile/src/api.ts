import { Platform } from "react-native";

const MOBILE_CLIENT_HEADER = "X-WordMap-Client";
const PRODUCTION_API_URL = "https://word-map.onrender.com";

export type MobileUser = {
  id: number;
  name: string;
  email: string;
  username: string | null;
  role?: "USER" | "MODERATOR" | "ADMIN";
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly window: "minute" | "day" | null;

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    window: "minute" | "day" | null = null
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.window = window;
  }
}

export function apiErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Erro na API";
  const body = payload as { error?: unknown; message?: unknown };
  const raw = body.error ?? body.message;
  if (Array.isArray(raw)) return raw.map(String).join("\n");
  if (typeof raw === "string" && raw.trim()) return raw;
  return "Erro na API";
}

function apiErrorMeta(payload: unknown): { code: string | null; window: "minute" | "day" | null } {
  if (!payload || typeof payload !== "object") return { code: null, window: null };
  const body = payload as { code?: unknown; window?: unknown };
  const code = typeof body.code === "string" ? body.code : null;
  const window = body.window === "minute" || body.window === "day" ? body.window : null;
  return { code, window };
}

/** Mensagem amigável para UI (rede, cota, API). */
export function userFacingError(error: unknown, fallback = "Algo deu errado"): string {
  if (error instanceof TypeError) {
    return "Sem conexão. Verifique a internet.";
  }
  if (error instanceof ApiError) {
    if (error.status === 429 || error.code === "TUTOR_QUOTA") {
      if (error.window === "day") {
        return "Limite diário de explicações — volte amanhã.";
      }
      if (error.window === "minute") {
        return "Limite por minuto. Espere um pouco e tente de novo.";
      }
      return "Limite de explicações por agora. Espere um pouco e tente de novo.";
    }
    if (error.status === 0 || error.message.toLowerCase().includes("network")) {
      return "Sem conexão. Verifique a internet.";
    }
    return error.message || fallback;
  }
  if (error instanceof Error && error.message.trim()) {
    const lower = error.message.toLowerCase();
    if (lower.includes("network") || lower.includes("failed to fetch")) {
      return "Sem conexão. Verifique a internet.";
    }
    return error.message;
  }
  return fallback;
}

function apiBase() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configured) return configured;
  // Expo Go / dev sem .env → API local. Builds EAS (preview/prod) usam Render via eas.json.
  if (__DEV__) {
    return Platform.OS === "android" ? "http://10.0.2.2:3001" : "http://localhost:3001";
  }
  return PRODUCTION_API_URL;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set(MOBILE_CLIENT_HEADER, "mobile");
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (init.token) {
    headers.set("Authorization", `Bearer ${init.token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers,
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Sem conexão. Verifique a internet.",
      0
    );
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }
  if (!response.ok) {
    const meta = apiErrorMeta(payload);
    throw new ApiError(apiErrorMessage(payload), response.status, meta.code, meta.window);
  }
  return payload as T;
}
