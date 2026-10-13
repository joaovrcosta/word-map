import "server-only";
import { serverApi } from "@/lib/api/server";
export type { UserSettings, UserSettingsUpdate } from "./user-settings";

export const getUserSettings = serverApi.getUserSettings;
export const upsertUserSettings = serverApi.upsertUserSettings;
export const getUserStats = serverApi.getUserStats;
