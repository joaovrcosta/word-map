import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReadingFontSize, ReadingPreferences, ReadingThemeMode } from "@word-map/shared";

const STORAGE_KEY = "wordmap-reading-preferences";

const FONT_SIZES: ReadingFontSize[] = [18, 22, 26];
const THEME_MODES: ReadingThemeMode[] = ["auto", "light", "dark"];
const SPEECH_RATE_MIN = 0.6;
const SPEECH_RATE_MAX = 1.3;
const SPEECH_RATE_STEP = 0.05;

const LOCAL_DEFAULTS: ReadingPreferences = {
  theme: "dark",
  voiceId: null,
  speechRate: 0.92,
  fontSize: 18,
  autoSaveWords: false,
};

function defaults(): ReadingPreferences {
  return { ...LOCAL_DEFAULTS };
}

function isFontSize(value: unknown): value is ReadingFontSize {
  return typeof value === "number" && (FONT_SIZES as number[]).includes(value);
}

function isThemeMode(value: unknown): value is ReadingThemeMode {
  return typeof value === "string" && (THEME_MODES as string[]).includes(value);
}

function clampSpeechRate(value: number): number {
  const stepped = Math.round(value / SPEECH_RATE_STEP) * SPEECH_RATE_STEP;
  return Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, Number(stepped.toFixed(2))));
}

/** Validador local (não depende de runtime exports novos do shared no Metro). */
export function parseReadingPreferences(raw: unknown): ReadingPreferences {
  const base = defaults();
  if (raw == null) return base;

  let data: unknown = raw;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw);
    } catch {
      return base;
    }
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return base;

  const input = data as Record<string, unknown>;
  if (isThemeMode(input.theme)) base.theme = input.theme;
  if (input.voiceId === null) base.voiceId = null;
  else if (typeof input.voiceId === "string" && input.voiceId.trim()) {
    base.voiceId = input.voiceId.trim();
  }
  if (typeof input.speechRate === "number" && Number.isFinite(input.speechRate)) {
    base.speechRate = clampSpeechRate(input.speechRate);
  }
  if (isFontSize(input.fontSize)) base.fontSize = input.fontSize;
  if (typeof input.autoSaveWords === "boolean") base.autoSaveWords = input.autoSaveWords;
  return base;
}

function safeParse(raw: unknown): ReadingPreferences {
  try {
    return parseReadingPreferences(raw);
  } catch {
    return defaults();
  }
}

async function readRaw(): Promise<string | null> {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return localStorage.getItem(STORAGE_KEY);
  }
  return AsyncStorage.getItem(STORAGE_KEY);
}

async function writeRaw(value: string): Promise<void> {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, value);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, value);
}

export function useReadingPreferences() {
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState<ReadingPreferences>(defaults);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await readRaw();
        if (cancelled) return;
        setPrefs(safeParse(raw));
      } catch {
        if (!cancelled) setPrefs(defaults());
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchPrefs = useCallback((partial: Partial<ReadingPreferences>) => {
    setPrefs((current) => {
      const next = safeParse({ ...(current ?? defaults()), ...partial });
      void writeRaw(JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  return { ready, prefs: prefs ?? defaults(), patchPrefs };
}
