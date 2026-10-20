import { type FlashcardWord } from "@word-map/shared";
import { type RawWord } from "./types";

export function toWord(raw: RawWord): FlashcardWord {
  return {
    id: raw.id,
    name: raw.name,
    grammaticalClass: raw.grammaticalClass,
    category: raw.category,
    translations: raw.translations ?? [],
    confidence: raw.confidence,
    lastPractice: raw.lastPractice ? new Date(raw.lastPractice) : null,
    vaultId: raw.vaultId,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

export function primaryTranslation(word: FlashcardWord) {
  return word.translations.find((item) => item.trim())?.trim() ?? "";
}
