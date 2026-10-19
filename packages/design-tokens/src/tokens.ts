export const brand = {
  green: "#24c875",
  greenText: "#14804a",
  greenTextDark: "#7ddea8",
  greenSoft: "#e7f8ee",
  greenSoftDark: "#143022",
  level1: "#ff4b4b",
  level2: "#ff9600",
  level3: "#ffc800",
  level4: "#24c875",
} as const;

export const radii = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
} as const;

export const fontFamily = "Nunito";

type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
  green: string;
  greenText: string;
  greenSoft: string;
};

export const light: ThemeColors = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  card: "#ffffff",
  cardForeground: "#0a0a0a",
  popover: "#ffffff",
  popoverForeground: "#0a0a0a",
  primary: "#171717",
  primaryForeground: "#fafafa",
  secondary: "#f5f5f5",
  secondaryForeground: "#171717",
  muted: "#f5f5f5",
  mutedForeground: "#737373",
  accent: "#f5f5f5",
  accentForeground: "#171717",
  destructive: "#e7000b",
  border: "#e5e5e5",
  input: "#e5e5e5",
  ring: "#a1a1a1",
  chart1: "#f54900",
  chart2: "#009689",
  chart3: "#104e64",
  chart4: "#ffb900",
  chart5: "#fe9a00",
  sidebar: "#fafafa",
  sidebarForeground: "#0a0a0a",
  sidebarPrimary: "#171717",
  sidebarPrimaryForeground: "#fafafa",
  sidebarAccent: "#f5f5f5",
  sidebarAccentForeground: "#171717",
  sidebarBorder: "#e5e5e5",
  sidebarRing: "#a1a1a1",
  green: brand.green,
  greenText: brand.greenText,
  greenSoft: brand.greenSoft,
};

export const dark: ThemeColors = {
  background: "#22272e",
  foreground: "#e6edf3",
  card: "#2d333b",
  cardForeground: "#e6edf3",
  popover: "#2d333b",
  popoverForeground: "#e6edf3",
  primary: "#e6edf3",
  primaryForeground: "#1c2128",
  secondary: "#2d333b",
  secondaryForeground: "#e6edf3",
  muted: "#2d333b",
  mutedForeground: "#8b949e",
  accent: "#2d333b",
  accentForeground: "#e6edf3",
  destructive: "#ff6467",
  border: "#373e47",
  input: "#373e47",
  ring: "#444c56",
  chart1: "#1447e6",
  chart2: "#00bc7d",
  chart3: "#fe9a00",
  chart4: "#ad46ff",
  chart5: "#ff2056",
  sidebar: "#1c2128",
  sidebarForeground: "#e6edf3",
  sidebarPrimary: "#58a6ff",
  sidebarPrimaryForeground: "#e6edf3",
  sidebarAccent: "#2d333b",
  sidebarAccentForeground: "#e6edf3",
  sidebarBorder: "#373e47",
  sidebarRing: "#444c56",
  green: brand.green,
  greenText: brand.greenTextDark,
  greenSoft: brand.greenSoftDark,
};

export const themes = { light, dark } as const;

export type ThemeName = keyof typeof themes;

const cssVars: Array<[keyof ThemeColors, string]> = [
  ["background", "--background"],
  ["foreground", "--foreground"],
  ["card", "--card"],
  ["cardForeground", "--card-foreground"],
  ["popover", "--popover"],
  ["popoverForeground", "--popover-foreground"],
  ["primary", "--primary"],
  ["primaryForeground", "--primary-foreground"],
  ["secondary", "--secondary"],
  ["secondaryForeground", "--secondary-foreground"],
  ["muted", "--muted"],
  ["mutedForeground", "--muted-foreground"],
  ["accent", "--accent"],
  ["accentForeground", "--accent-foreground"],
  ["destructive", "--destructive"],
  ["border", "--border"],
  ["input", "--input"],
  ["ring", "--ring"],
  ["chart1", "--chart-1"],
  ["chart2", "--chart-2"],
  ["chart3", "--chart-3"],
  ["chart4", "--chart-4"],
  ["chart5", "--chart-5"],
  ["sidebar", "--sidebar"],
  ["sidebarForeground", "--sidebar-foreground"],
  ["sidebarPrimary", "--sidebar-primary"],
  ["sidebarPrimaryForeground", "--sidebar-primary-foreground"],
  ["sidebarAccent", "--sidebar-accent"],
  ["sidebarAccentForeground", "--sidebar-accent-foreground"],
  ["sidebarBorder", "--sidebar-border"],
  ["sidebarRing", "--sidebar-ring"],
  ["green", "--brand-green"],
  ["greenText", "--brand-green-text"],
  ["greenSoft", "--brand-green-soft"],
];

function declarations(theme: ThemeColors): string {
  return cssVars
    .map(([key, name]) => `  ${name}: ${theme[key]};`)
    .join("\n");
}

const darkScale = {
  "--color-gray-950": "#1c2128",
  "--color-gray-900": "#22272e",
  "--color-gray-800": "#2d333b",
  "--color-gray-700": "#444c56",
  "--color-zinc-950": "#1c2128",
  "--color-zinc-900": "#22272e",
  "--color-zinc-800": "#2d333b",
  "--color-zinc-700": "#444c56",
};

export function renderTokensCss(): string {
  const scale = Object.entries(darkScale)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
  return `:root {
  color-scheme: light;
  --radius: 0.625rem;
${declarations(light)}
}

.dark {
  color-scheme: dark;
${declarations(dark)}
${scale}
}
`;
}
