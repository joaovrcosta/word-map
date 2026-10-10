"use client";

import { Moon, Sun } from "lucide-react";
import useThemeStore from "@/store/themeStore";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center gap-2 text-[#afafaf] hover:text-[#1cb0f6]",
        compact ? "justify-center" : "",
        className
      )}
      aria-label={isDark ? "Usar tema claro" : "Usar tema escuro"}
    >
      {isDark ? (
        <Sun className="size-5 shrink-0" strokeWidth={2} />
      ) : (
        <Moon className="size-5 shrink-0" strokeWidth={2} />
      )}
      {!compact && (
        <span className="text-[13px] font-extrabold uppercase tracking-wide">
          {isDark ? "Tema claro" : "Tema escuro"}
        </span>
      )}
    </button>
  );
}
