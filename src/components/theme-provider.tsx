"use client";

import { useEffect } from "react";
import { hydrateTheme } from "@/store/themeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    hydrateTheme();
  }, []);

  return children;
}
