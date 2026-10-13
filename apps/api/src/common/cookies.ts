import type { CookieOptions, Response } from "express";

export const AUTH_COOKIE = "auth-token";

export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export function readCookie(
  header: string | undefined,
  name: string
): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    if (trimmed.slice(0, index) === name) {
      return decodeURIComponent(trimmed.slice(index + 1));
    }
  }
  return undefined;
}

export function clearAuthCookie(response: Response) {
  response.clearCookie(AUTH_COOKIE, { path: "/" });
}
