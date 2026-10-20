import { buildFlashcardQueue, selectPracticeWords } from "@/lib/flashcard-queue";
import { isWordDue, latenessDays } from "@/lib/flashcard-schedule";
import type { FlashcardWord } from "@/actions/flashcards";

const seen = new Date("2020-01-01T15:00:00-03:00");

function word(
  id: number,
  name: string,
  translation: string,
  confidence: number,
  lastPractice: Date | null = seen
): FlashcardWord {
  return {
    id,
    name,
    grammaticalClass: "substantivo",
    category: null,
    translations: [translation],
    confidence,
    lastPractice,
    vaultId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("isWordDue", () => {
  const now = new Date("2026-10-20T09:00:00-03:00");

  it("vence no dia seguinte mesmo antes de completar 24 horas", () => {
    expect(
      isWordDue(
        { confidence: 1, lastPractice: new Date("2026-10-19T22:00:00-03:00") },
        now
      )
    ).toBe(true);
  });

  it("não vence o nível 1 no mesmo dia", () => {
    expect(
      isWordDue(
        { confidence: 1, lastPractice: new Date("2026-10-20T01:00:00-03:00") },
        now
      )
    ).toBe(false);
  });
});

describe("latenessDays", () => {
  it("mede o atraso depois do intervalo do nível", () => {
    const late = latenessDays(
      { confidence: 4, lastPractice: new Date("2026-09-20T12:00:00-03:00") },
      new Date("2026-10-20T12:00:00-03:00")
    );
    expect(late).toBe(9);
  });
});

describe("selectPracticeWords", () => {
  it("limita a três palavras novas", () => {
    const words = [1, 2, 3, 4].map((id) =>
      word(id, `w${id}`, `t${id}`, 1, null)
    );
    expect(selectPracticeWords(words, seen).map((item) => item.id)).toEqual([1, 2, 3]);
  });
});

describe("buildFlashcardQueue", () => {
  it("agrupa quatro palavras já praticadas de nível baixo em um combinar", () => {
    const words = [
      word(1, "time", "tempo", 2),
      word(2, "weight", "peso", 2),
      word(3, "stretch", "alongar", 1),
      word(4, "injury", "lesão", 2),
      word(5, "early", "cedo", 4),
    ];

    const steps = buildFlashcardQueue(words, () => 0);

    expect(steps.filter((step) => step.type === "match")).toHaveLength(1);
    expect(steps.filter((step) => step.type === "recall")).toHaveLength(1);
    expect(steps.filter((step) => step.type === "listen")).toHaveLength(0);
    const match = steps.find((step) => step.type === "match");
    if (match?.type === "match") {
      expect(match.pairs.map((pair) => pair.word.id)).toEqual([1, 2, 3, 4]);
    }
  });

  it("usa ouvir quando ainda não há quatro palavras para combinar", () => {
    const words = [word(1, "time", "tempo", 2), word(2, "weight", "peso", 2)];
    const steps = buildFlashcardQueue(words, () => 0);
    expect(steps.every((step) => step.type === "listen")).toBe(true);
  });

  it("mostra a tradução no recordar para palavra nova", () => {
    const steps = buildFlashcardQueue([word(1, "run", "correr", 1, null)], () => 0);
    expect(steps.map((step) => step.type)).toEqual(["recall"]);
  });

  it("não dá completar para nome com mais de uma palavra", () => {
    const steps = buildFlashcardQueue(
      [word(1, "pick up", "pegar", 4), word(2, "run", "correr", 4)],
      () => 0,
      [
        { wordId: 1, sentence: "Please pick up the book.", answer: "pick up" },
        { wordId: 2, sentence: "I run every day.", answer: "run" },
      ]
    );
    expect(steps.filter((step) => step.type === "cloze")).toHaveLength(1);
    expect(steps.some((step) => step.type === "cloze" && step.word.id === 1)).toBe(false);
  });

  it("completa no nível alto só quando a frase existe", () => {
    const withCloze = buildFlashcardQueue([word(2, "walk", "andar", 3)], () => 0, [
      { wordId: 2, sentence: "I walk home.", answer: "walk" },
    ]);
    const without = buildFlashcardQueue([word(2, "walk", "andar", 3)], () => 0, []);
    expect(withCloze.map((step) => step.type)).toEqual(["cloze"]);
    expect(without.map((step) => step.type)).toEqual(["recall"]);
  });

  it("não passa de 10 cards", () => {
    const words = Array.from({ length: 16 }, (_, index) =>
      word(index + 1, `w${index}`, `t${index}`, 4)
    );
    expect(buildFlashcardQueue(words, () => 0)).toHaveLength(10);
  });
});
