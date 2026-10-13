import "server-only";
import { serverApi } from "@/lib/api/server";
export type { WordOriginEntry } from "./word-origins";

export const listWordOrigins = serverApi.listWordOrigins;
export const recordWordOrigin = serverApi.recordWordOrigin;
