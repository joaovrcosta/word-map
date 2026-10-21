import { createContext, useContext, type ReactNode } from "react";
import { dark, radii, type ThemeName } from "@word-map/design-tokens";

const fonts = {
  regular: "SpaceGrotesk_400Regular",
  medium: "SpaceGrotesk_500Medium",
  semibold: "SpaceGrotesk_600SemiBold",
  bold: "SpaceGrotesk_700Bold",
};

export const shell = {
  background: "#121212",
  foreground: "#FFFFFF",
  muted: "#8E8E93",
  surface: "#1C1C1E",
  line: "#3A3A3A",
  tabBar: "#2A2A2C",
  chip: "#2C2C2E",
  chipText: "#FFFFFF",
  chipActive: "#FFFFFF",
  chipActiveText: "#111111",
  tones: {
    cream: "#F6E7A8",
    blue: "#C5E6F6",
    green: "#C9F2C4",
    lilac: "#E3D4F6",
  },
  onPastel: "#1A1A1A",
  onPastelMuted: "#3F3A32",
  actionOnPastel: "#1A1A1A",
  actionDangerOnPastel: "#6E2430",
  dangerOnDark: "#FF8A8A",
  mascot: {
    body: "#2F9BFF",
    eye: "#F4F7FB",
    pupil: "#1A1C1E",
    laptop: "#E8EEF5",
    laptopBase: "#C5D4E4",
    accent: "#FF9F1A",
    ring: "#D5D5D5",
  },
} as const;

export const toneNames = ["cream", "blue", "green", "lilac"] as const;
export type ToneName = (typeof toneNames)[number];

export const fixedTones = {
  ranking: "cream",
  vaults: "blue",
  books: "green",
  words: "cream",
  connections: "green",
  activity: "lilac",
  xp: "blue",
} as const satisfies Record<string, ToneName>;

export const tabBarMetrics = {
  height: 62,
  gap: 12,
  margin: 16,
} as const;

export function tabBarBottom(insetBottom: number) {
  return Math.max(insetBottom, 12);
}

export function tabBarContentInset(insetBottom: number) {
  return tabBarMetrics.height + tabBarMetrics.gap + tabBarBottom(insetBottom);
}

export function tabBarHidden(pathname: string) {
  return /^\/books\/[^/]+\/chapters\/[^/]+/.test(pathname) || /^\/flashcards\/[^/]+/.test(pathname);
}

export function toneFor(id: number): ToneName {
  const mixed = Math.imul(id | 0, 0x45d9f3b) >>> 0;
  return toneNames[mixed % toneNames.length] ?? "cream";
}

const colors = {
  ...dark,
  background: shell.background,
  foreground: shell.foreground,
  card: shell.surface,
  cardForeground: shell.foreground,
  popover: shell.surface,
  popoverForeground: shell.foreground,
  primary: shell.foreground,
  primaryForeground: shell.background,
  secondary: shell.surface,
  secondaryForeground: shell.foreground,
  muted: shell.surface,
  mutedForeground: shell.muted,
  accent: shell.surface,
  accentForeground: shell.foreground,
  border: shell.line,
  input: shell.line,
};

type Theme = {
  name: ThemeName;
  colors: typeof colors;
  radii: typeof radii;
  fonts: typeof fonts;
  shell: typeof shell;
};

const themeValue: Theme = {
  name: "dark",
  colors,
  radii,
  fonts,
  shell,
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error("useTheme precisa ficar dentro de ThemeProvider");
  }
  return theme;
}
