import type { CookieOptions, Response } from "express";

export const AUTH_COOKIE = "auth-token";
export const MOBILE_CLIENT_HEADER = "x-wordmap-client";

export function isMobileClient(header: string | undefined): boolean {
  return header?.trim().toLowerCase() === "mobile";
}

export function readAccessToken(headers: {
  cookie?: string;
  authorization?: string;
}): string | undefined {
  const authorization = headers.authorization?.trim();
  if (authorization) {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization);
    if (match?.[1]) return match[1];
  }
  return readCookie(headers.cookie, AUTH_COOKIE);
}

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
  const { httpOnly, secure, sameSite, path } = authCookieOptions();
  response.clearCookie(AUTH_COOKIE, { httpOnly, secure, sameSite, path });
}
