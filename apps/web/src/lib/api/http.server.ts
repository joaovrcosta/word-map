import "server-only";
import { cookies } from "next/headers";
import { apiRequest, type ApiInit } from "./http";

export async function serverRequest<T = any>(
  method: string,
  path: string,
  body?: unknown,
  init?: ApiInit
): Promise<T> {
  const cookie = (await cookies()).toString();
  return apiRequest<T>(method, path, body, { ...init, cookie });
}
