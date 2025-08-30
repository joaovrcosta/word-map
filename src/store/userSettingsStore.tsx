"use client";

import { create } from "zustand";

interface UserSettings {
  useAllVaultsForLinks: boolean;
}

interface UserSettingsStore {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setSettings: (settings: UserSettings) => void;
}

const useUserSettingsStore = create<UserSettingsStore>((set) => ({
  settings: {
    useAllVaultsForLinks: false,
  },
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),
  setSettings: (settings) => set({ settings }),
}));

export default useUserSettingsStore;
