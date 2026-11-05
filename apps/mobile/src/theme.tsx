import { createContext, useContext, type ReactNode } from "react";
import { dark, radii, type ThemeName } from "@word-map/design-tokens";

const fonts = {
  regular: "SpaceGrotesk_400Regular",
  medium: "SpaceGrotesk_500Medium",
  semibold: "SpaceGrotesk_600SemiBold",
  bold: "SpaceGrotesk_700Bold",
  display: "Ephesis_400Regular",
  serif: "LibreBaskerville_400Regular",
  serifItalic: "LibreBaskerville_400Regular_Italic",
  serifBold: "LibreBaskerville_700Bold",
};

export const shell = {
  background: "#0B0B0B",
  foreground: "#FFFFFF",
  muted: "#8E8E93",
  surface: "#161616",
  line: "#2A2A2A",
  tabBar: "#000000",
  chip: "#1C1C1E",
  chipText: "#FFFFFF",
  chipActive: "#FFFFFF",
  chipActiveText: "#0B0B0B",
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
  glow: {
    purple: "#C084FC",
    violet: "#8B5CF6",
    indigo: "#6366F1",
    blue: "#60A5FA",
  },
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
  height: 58,
  gap: 0,
  margin: 0,
  centerSize: 56,
  centerLift: 18,
} as const;

export function tabBarBottom(_insetBottom: number) {
  return 0;
}

export function tabBarContentInset(insetBottom: number) {
  return tabBarMetrics.height + Math.max(insetBottom, 10) + tabBarMetrics.centerLift / 2;
}

export function tabBarHidden(pathname: string) {
  return (
    /^\/books\/[^/]+\/chapters\/[^/]+/.test(pathname) ||
    /^\/flashcards\/[^/]+/.test(pathname) ||
    /^\/stories\/[^/]+$/.test(pathname) ||
    /^\/news\/[^/]+$/.test(pathname)
  );
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
