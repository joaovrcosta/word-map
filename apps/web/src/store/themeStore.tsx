"use client";

import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "word-map-theme";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: "dark",
  setTheme: (theme) => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },
  toggleTheme: () => {
    get().setTheme(get().theme === "dark" ? "light" : "dark");
  },
}));

export function hydrateTheme() {
  let theme: Theme = "dark";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") theme = stored;
  } catch {
    /* ignore */
  }
  applyTheme(theme);
  useThemeStore.setState({ theme });
}

export { STORAGE_KEY };
export default useThemeStore;
