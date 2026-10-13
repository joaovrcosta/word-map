export type WordOriginEntry = {
  id: number;
  meaning: string;
  sentence: string | null;
  sourceTitle: string | null;
  sourceKind: string;
  createdAt: string;
};

import { browserApi } from "@/lib/api/resources";

export const listWordOrigins = browserApi.listWordOrigins;
export const recordWordOrigin = browserApi.recordWordOrigin;
