export interface UserSettings {
  id: number;
  userId: number;
  useAllVaultsForLinks: boolean;
  autoTranslateWordPreview: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserSettingsUpdate = Partial<
  Pick<UserSettings, "useAllVaultsForLinks" | "autoTranslateWordPreview">
>;

import { browserApi } from "@/lib/api/resources";

export const getUserSettings = browserApi.getUserSettings as () => Promise<UserSettings | null>;
export const upsertUserSettings = browserApi.upsertUserSettings;
export const getUserStats = browserApi.getUserStats;
