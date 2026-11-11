export const TRANSLATION_LANGUAGES = [
  { code: "pt", label: "Português", promptName: "português" },
  { code: "es", label: "Español", promptName: "espanhol" },
  { code: "en", label: "English", promptName: "inglês" },
  { code: "fr", label: "Français", promptName: "francês" },
  { code: "it", label: "Italiano", promptName: "italiano" },
  { code: "de", label: "Deutsch", promptName: "alemão" },
  { code: "ja", label: "日本語", promptName: "japonês" },
  { code: "zh", label: "中文", promptName: "chinês" },
  { code: "ko", label: "한국어", promptName: "coreano" },
  { code: "ru", label: "Русский", promptName: "russo" },
] as const;

export type TranslationLanguageCode = (typeof TRANSLATION_LANGUAGES)[number]["code"];

export const DEFAULT_TRANSLATION_LANGUAGE: TranslationLanguageCode = "pt";

const CODES = new Set(
  TRANSLATION_LANGUAGES.map((item) => item.code)
);

export function isTranslationLanguageCode(
  value: unknown
): value is TranslationLanguageCode {
  return typeof value === "string" && CODES.has(value as TranslationLanguageCode);
}

export function normalizeTranslationLanguage(
  value: unknown
): TranslationLanguageCode {
  return isTranslationLanguageCode(value) ? value : DEFAULT_TRANSLATION_LANGUAGE;
}

export function translationLanguageLabel(code: unknown): string {
  const normalized = normalizeTranslationLanguage(code);
  return (
    TRANSLATION_LANGUAGES.find((item) => item.code === normalized)?.label ??
    "Português"
  );
}

export function translationLanguagePromptName(code: unknown): string {
  const normalized = normalizeTranslationLanguage(code);
  return (
    TRANSLATION_LANGUAGES.find((item) => item.code === normalized)?.promptName ??
    "português"
  );
}
