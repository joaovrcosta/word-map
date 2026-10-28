import { createContext, useContext, useMemo, type ReactNode } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import type { ReadingThemeMode } from "@word-map/shared";

export type ReaderAppearance = "light" | "dark";

export type ReaderTheme = {
  appearance: ReaderAppearance;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  surface: string;
  progressTrack: string;
  progressFill: string;
  accent: string;
  icon: string;
  statusBarStyle: "light" | "dark";
  highlight: {
    selectedBg: string;
    selectedFg: string;
    vaultBg: string;
    vaultFg: string;
    similarBg: string;
  };
  menu: {
    card: string;
    cardBorder: string;
    chip: string;
    chipText: string;
    muted: string;
    danger: string;
  };
};

const darkReader: ReaderTheme = {
  appearance: "dark",
  background: "#121212",
  foreground: "#FFFFFF",
  muted: "#8E8E93",
  border: "#3A3A3A",
  surface: "#1C1C1E",
  progressTrack: "#3A3A3A",
  progressFill: "#24c875",
  accent: "#24c875",
  icon: "#FFFFFF",
  statusBarStyle: "light",
  highlight: {
    selectedBg: "#3dd68c",
    selectedFg: "#0b1f14",
    vaultBg: "rgba(36,200,117,0.28)",
    vaultFg: "#7ddea8",
    similarBg: "rgba(61,214,140,0.18)",
  },
  menu: {
    card: "#1C1C1E",
    cardBorder: "#3A3A3A",
    chip: "#2C2C2E",
    chipText: "#FFFFFF",
    muted: "#8E8E93",
    danger: "#FF8A8A",
  },
};

const lightReader: ReaderTheme = {
  appearance: "light",
  background: "#F7F4EF",
  foreground: "#1A1A1A",
  muted: "#6B6B6B",
  border: "#D9D4CC",
  surface: "#FFFFFF",
  progressTrack: "#E4DFD6",
  progressFill: "#14804a",
  accent: "#14804a",
  icon: "#1A1A1A",
  statusBarStyle: "dark",
  highlight: {
    selectedBg: "#24c875",
    selectedFg: "#ffffff",
    vaultBg: "rgba(20,128,74,0.16)",
    vaultFg: "#14804a",
    similarBg: "rgba(20,128,74,0.10)",
  },
  menu: {
    card: "#FFFFFF",
    cardBorder: "#E5E5E5",
    chip: "#F0EDE7",
    chipText: "#1A1A1A",
    muted: "#6B6B6B",
    danger: "#C62828",
  },
};

export function resolveReaderTheme(
  mode: ReadingThemeMode,
  system: string | null | undefined
): ReaderTheme {
  const appearance: ReaderAppearance =
    mode === "auto" ? (system === "light" ? "light" : "dark") : mode;
  return appearance === "light" ? lightReader : darkReader;
}

export function makeReaderStyles(theme: ReaderTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    progressTrack: { backgroundColor: theme.progressTrack },
    progressFill: { backgroundColor: theme.progressFill },
  });
}

const ReaderThemeContext = createContext<ReaderTheme>(darkReader);

export function ReaderThemeProvider({
  mode,
  children,
}: {
  mode: ReadingThemeMode;
  children: ReactNode;
}) {
  const system = useColorScheme();
  const theme = useMemo(() => resolveReaderTheme(mode, system), [mode, system]);
  return <ReaderThemeContext.Provider value={theme}>{children}</ReaderThemeContext.Provider>;
}

export function useReaderTheme() {
  return useContext(ReaderThemeContext);
}

export function useResolvedReaderTheme(mode: ReadingThemeMode): ReaderTheme {
  const system = useColorScheme();
  return useMemo(() => resolveReaderTheme(mode, system), [mode, system]);
}
