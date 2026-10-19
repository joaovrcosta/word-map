import { Platform } from "react-native";

const MOBILE_CLIENT_HEADER = "X-WordMap-Client";

export type MobileUser = {
  id: number;
  name: string;
  email: string;
  username: string | null;
};

function apiBase() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (configured) return configured;
  // O emulador Android enxerga a máquina host em 10.0.2.2, não em localhost.
  return Platform.OS === "android"
    ? "http://10.0.2.2:3001"
    : "http://localhost:3001";
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
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : "Erro na API";
    throw new Error(message);
  }
  return payload as T;
}
