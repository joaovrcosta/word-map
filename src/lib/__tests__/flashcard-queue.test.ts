import { buildFlashcardQueue } from "@/lib/flashcard-queue";
import type { FlashcardWord } from "@/actions/flashcards";

function word(
  id: number,
  name: string,
  translation: string,
  confidence: number
): FlashcardWord {
  return {
    id,
    name,
    grammaticalClass: "substantivo",
    category: null,
    translations: [translation],
    confidence,
    vaultId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("buildFlashcardQueue", () => {
  it("mantém palavra nova no card e cria um desafio de combinar", () => {
    const words = [
      word(1, "time", "tempo", 1),
      word(2, "weight", "peso", 2),
      word(3, "stretch", "alongar", 3),
      word(4, "injury", "lesão", 2),
      word(5, "early", "cedo", 4),
    ];

    const steps = buildFlashcardQueue(words, () => 0);

    expect(steps.filter((step) => step.type === "recall")).toHaveLength(1);
    expect(steps.filter((step) => step.type === "match")).toHaveLength(1);
    expect(steps.filter((step) => step.type === "listen")).toHaveLength(0);

    const match = steps.find((step) => step.type === "match");
    if (match?.type === "match") {
      expect(match.pairs).toHaveLength(4);
      expect(match.pairs.map((pair) => pair.word.id)).not.toContain(1);
    }
  });

  it("usa ouvir quando ainda não há quatro palavras para combinar", () => {
    const words = [
      word(1, "time", "tempo", 2),
      word(2, "weight", "peso", 3),
    ];

    const steps = buildFlashcardQueue(words, () => 0);
    const listen = steps.filter((step) => step.type === "listen");

    expect(listen).toHaveLength(2);
    for (const step of listen) {
      if (step.type !== "listen") continue;
      expect(step.options.length).toBeGreaterThanOrEqual(2);
      expect(
        step.options.some(
          (option) =>
            option.toLowerCase() === step.word.translations[0].toLowerCase()
        )
      ).toBe(true);
    }
  });

  it("cai no card quando o vault não tem traduções diferentes", () => {
    const words = [
      word(1, "hi", "olá", 3),
      word(2, "hello", "olá", 4),
    ];

    const steps = buildFlashcardQueue(words, () => 0);

    expect(steps.every((step) => step.type === "recall")).toBe(true);
  });
});
