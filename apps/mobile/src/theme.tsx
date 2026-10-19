import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import {
  dark,
  light,
  radii,
  type ThemeName,
} from "@word-map/design-tokens";

const fonts = {
  regular: "Nunito_400Regular",
  medium: "Nunito_500Medium",
  semibold: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
};

type Theme = {
  name: ThemeName;
  colors: typeof light;
  radii: typeof radii;
  fonts: typeof fonts;
};

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const name: ThemeName = scheme === "dark" ? "dark" : "light";
  const value = useMemo<Theme>(
    () => ({
      name,
      colors: name === "dark" ? dark : light,
      radii,
      fonts,
    }),
    [name]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error("useTheme precisa ficar dentro de ThemeProvider");
  }
  return theme;
}
