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

export function apiErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Erro na API";
  const body = payload as { error?: unknown; message?: unknown };
  const raw = body.error ?? body.message;
  if (Array.isArray(raw)) return raw.map(String).join("\n");
  if (typeof raw === "string" && raw.trim()) return raw;
  return "Erro na API";
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

  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(apiErrorMessage(payload));
  }
  return payload as T;
}
