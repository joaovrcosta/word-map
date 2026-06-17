"use client";

import { useEffect } from "react";
import { getUserSettings } from "@/actions/user-settings";
import useUserSettingsStore from "@/store/userSettingsStore";

export function useLoadUserSettings() {
  const setSettings = useUserSettingsStore((state) => state.setSettings);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userSettings = await getUserSettings();
        if (userSettings) {
          setSettings({
            useAllVaultsForLinks: userSettings.useAllVaultsForLinks,
            autoTranslateWordPreview: userSettings.autoTranslateWordPreview,
          });
        }
      } catch (error) {
        console.error("Erro ao carregar configurações do usuário:", error);
      }
    };

    loadSettings();
  }, [setSettings]);
}
