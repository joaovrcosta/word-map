"use client";

import {
  DEFAULT_TRANSLATION_LANGUAGE,
  type TranslationLanguageCode,
} from "@word-map/shared";
import { create } from "zustand";

interface UserSettings {
  useAllVaultsForLinks: boolean;
  autoTranslateWordPreview: boolean;
  translationLanguage: TranslationLanguageCode;
}

interface UserSettingsStore {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setSettings: (settings: UserSettings) => void;
}

const useUserSettingsStore = create<UserSettingsStore>((set) => ({
  settings: {
    useAllVaultsForLinks: false,
    autoTranslateWordPreview: false,
    translationLanguage: DEFAULT_TRANSLATION_LANGUAGE,
  },
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),
  setSettings: (settings) => set({ settings }),
}));

export default useUserSettingsStore;
