import {
  alignSpokenWords,
  speakPassScore,
  tokenizeSpeakText,
  tokensMatch,
} from "@word-map/shared";

describe("speak-align", () => {
  describe("tokenizeSpeakText", () => {
    it("ignora maiúsculas e pontuação", () => {
      expect(tokenizeSpeakText("We are going!")).toEqual(["we", "are", "going"]);
    });
  });

  describe("tokensMatch", () => {
    it("aceita sinônimos e números", () => {
      expect(tokensMatch("color", "colour")).toBe(true);
      expect(tokensMatch("2", "two")).toBe(true);
    });

    it("aceita Levenshtein 1 só em palavras com 5+ letras", () => {
      expect(tokensMatch("elephant", "elephan")).toBe(true);
      expect(tokensMatch("cat", "cot")).toBe(false);
    });
  });

  describe("alignSpokenWords", () => {
    it("marca match perfeito", () => {
      expect(alignSpokenWords("we are going", "We are going.", { finalized: true })).toEqual([
        "correct",
        "correct",
        "correct",
      ]);
    });

    it("tolera palavra extra no meio", () => {
      expect(
        alignSpokenWords("we are going", "we uh are going", { finalized: true })
      ).toEqual(["correct", "correct", "correct"]);
    });

    it("omite token sem cascata vermelha", () => {
      expect(
        alignSpokenWords("we are going to shop", "we are going shop", { finalized: true })
      ).toEqual(["correct", "correct", "correct", "pending", "correct"]);
    });

    it("transcript vazio deixa tudo pending", () => {
      expect(alignSpokenWords("we are going", "", { finalized: true })).toEqual([
        "pending",
        "pending",
        "pending",
      ]);
    });

    it("tudo errado marca wrong no final", () => {
      expect(alignSpokenWords("cat dog", "fish bird", { finalized: true })).toEqual([
        "wrong",
        "wrong",
      ]);
    });

    it("I'm falado como I am (1 esperado, 2 falados)", () => {
      expect(alignSpokenWords("I'm happy", "I am happy", { finalized: true })).toEqual([
        "correct",
        "correct",
      ]);
      expect(tokenizeSpeakText("I'm happy")).toHaveLength(2);
    });

    it("going to falado como gonna (2 esperados, 1 falado)", () => {
      expect(
        alignSpokenWords("we are going to shop", "we are gonna shop", { finalized: true })
      ).toEqual(["correct", "correct", "correct", "correct", "correct"]);
    });

    it("parcial não pinta wrong e ignora último token incompleto", () => {
      expect(
        alignSpokenWords("the elephant runs", "the elep", { finalized: false })
      ).toEqual(["correct", "pending", "pending"]);
      expect(
        alignSpokenWords("we are going", "we xx are going", { finalized: false })
      ).toEqual(["correct", "correct", "pending"]);
    });

    it("lida com palavra repetida na esperada", () => {
      expect(
        alignSpokenWords("the cat and the dog", "the cat and the dog", { finalized: true })
      ).toEqual(["correct", "correct", "correct", "correct", "correct"]);
    });

    it("lookahead no esperado tem prioridade sobre o do falado", () => {
      // spoken[0]=are casa com expected[1]; se prioridade B vencesse consumiria extras errados
      expect(
        alignSpokenWords("we are going", "are we going", { finalized: true })
      ).toEqual(["pending", "correct", "correct"]);
    });
  });

  describe("speakPassScore", () => {
    it("n=6 tolera 1 erro; n=4 não", () => {
      const sixOneMiss = [
        "correct",
        "correct",
        "correct",
        "correct",
        "correct",
        "pending",
      ] as const;
      expect(speakPassScore([...sixOneMiss])).toBe(true);
      const fourOneMiss = ["correct", "correct", "correct", "wrong"] as const;
      expect(speakPassScore([...fourOneMiss])).toBe(false);
    });
  });
});
