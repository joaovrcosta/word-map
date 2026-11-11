import {
  DEFAULT_TRANSLATION_LANGUAGE,
  normalizeTranslationLanguage,
  type TranslationLanguageCode,
} from "@word-map/shared";

export async function fetchTranslationLanguage(
  request: <T>(path: string, init?: RequestInit) => Promise<T>
): Promise<TranslationLanguageCode> {
  try {
    const settings = await request<{ translationLanguage?: string } | null>("/users/settings");
    return normalizeTranslationLanguage(settings?.translationLanguage);
  } catch {
    return DEFAULT_TRANSLATION_LANGUAGE;
  }
}
