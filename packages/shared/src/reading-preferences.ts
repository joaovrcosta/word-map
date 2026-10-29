export const READING_FONT_SIZES = [18, 22, 26] as const;
export type ReadingFontSize = (typeof READING_FONT_SIZES)[number];

export const READING_THEME_MODES = ["auto", "light", "dark"] as const;
export type ReadingThemeMode = (typeof READING_THEME_MODES)[number];

export const READING_SPEECH_RATE_MIN = 0.6;
export const READING_SPEECH_RATE_MAX = 1.3;
export const READING_SPEECH_RATE_STEP = 0.05;
export const READING_SPEECH_RATE_DEFAULT = 0.92;
export const READING_WORD_SPEECH_RATE = 0.88;

export type ReadingPreferences = {
  theme: ReadingThemeMode;
  voiceId: string | null;
  speechRate: number;
  fontSize: ReadingFontSize;
  autoSaveWords: boolean;
};

export const DEFAULT_READING_PREFERENCES: ReadingPreferences = {
  theme: "dark",
  voiceId: null,
  speechRate: READING_SPEECH_RATE_DEFAULT,
  fontSize: 22,
  autoSaveWords: false,
};

function isReadingFontSize(value: unknown): value is ReadingFontSize {
  return typeof value === "number" && (READING_FONT_SIZES as readonly number[]).includes(value);
}

function isReadingThemeMode(value: unknown): value is ReadingThemeMode {
  return typeof value === "string" && (READING_THEME_MODES as readonly string[]).includes(value);
}

function clampSpeechRate(value: number): number {
  const stepped = Math.round(value / READING_SPEECH_RATE_STEP) * READING_SPEECH_RATE_STEP;
  return Math.min(
    READING_SPEECH_RATE_MAX,
    Math.max(READING_SPEECH_RATE_MIN, Number(stepped.toFixed(2)))
  );
}

/** Valida JSON/objeto de preferências; nunca lança — cai nos defaults. */
export function parseReadingPreferences(raw: unknown): ReadingPreferences {
  const base = { ...DEFAULT_READING_PREFERENCES };
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

  if (isReadingThemeMode(input.theme)) base.theme = input.theme;

  if (input.voiceId === null) base.voiceId = null;
  else if (typeof input.voiceId === "string" && input.voiceId.trim()) {
    base.voiceId = input.voiceId.trim();
  }

  if (typeof input.speechRate === "number" && Number.isFinite(input.speechRate)) {
    base.speechRate = clampSpeechRate(input.speechRate);
  }

  if (isReadingFontSize(input.fontSize)) base.fontSize = input.fontSize;

  if (typeof input.autoSaveWords === "boolean") base.autoSaveWords = input.autoSaveWords;

  return base;
}
