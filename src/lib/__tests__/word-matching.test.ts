import {
  createHighlightMarker,
  escapeRegExp,
  extractTextTokens,
  getLemmaForms,
  lemmatizeWord,
  matchTextToVaultWords,
  normalizeToken,
  parseHighlightMarker,
  splitHighlightParts,
  type MatchableVault,
} from "../word-matching";

const createVault = (
  id: number,
  name: string,
  words: Array<{ id: number; name: string }>
): MatchableVault => ({
  id,
  name,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  userId: 1,
  words: words.map((word) => ({
    ...word,
    grammaticalClass: "verb",
    category: null,
    translations: ["traducao"],
    confidence: 1,
    isSaved: true,
    frequency: 0,
    vaultId: id,
    createdAt: new Date("2024-01-01"),
  })),
});

describe("word-matching", () => {
  describe("normalizeToken", () => {
    it("remove pontuação nas bordas", () => {
      expect(normalizeToken("word,")).toBe("word");
      expect(normalizeToken('"hello"')).toBe("hello");
    });

    it("preserva hífen e apóstrofo internos", () => {
      expect(normalizeToken("well-known")).toBe("well-known");
      expect(normalizeToken("don't")).toBe("don't");
    });
  });

  describe("lemmatizeWord", () => {
    it("reduz formas verbais e plurais", () => {
      expect(lemmatizeWord("running")).toBe("run");
      expect(lemmatizeWord("runs")).toBe("run");
      expect(lemmatizeWord("cats")).toBe("cat");
    });
  });

  describe("getLemmaForms", () => {
    it("inclui partes de palavras hifenizadas", () => {
      const forms = getLemmaForms("well-known");
      expect(forms).toContain("well-known");
      expect(forms).toContain("well");
      expect(forms).toContain("known");
    });
  });

  describe("extractTextTokens", () => {
    it("extrai tokens com hífen e apóstrofo", () => {
      expect(extractTextTokens("It's well-known.")).toEqual([
        "it's",
        "well-known",
      ]);
    });
  });

  describe("matchTextToVaultWords", () => {
    const vault = createVault(1, "English", [{ id: 1, name: "run" }]);

    it("encontra running via lemma de run", () => {
      const result = matchTextToVaultWords("She is running fast", [vault]);
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe("running");
      expect(result[0].vaultInfo[0].words[0].name).toBe("run");
    });

    it("encontra runs e Ran via lemma", () => {
      const result = matchTextToVaultWords("The runs were good. Ran home.", [
        vault,
      ]);
      const words = result.map((item) => item.word.toLowerCase());
      expect(words).toContain("runs");
      expect(words).toContain("ran");
    });

    it("encontra palavra com pontuação", () => {
      const wordVault = createVault(2, "Basic", [{ id: 2, name: "word" }]);
      const result = matchTextToVaultWords("This word, matters", [wordVault]);
      expect(result.some((item) => item.word === "word")).toBe(true);
    });

    it("encontra parte de palavra hifenizada", () => {
      const knownVault = createVault(3, "Adj", [{ id: 3, name: "known" }]);
      const result = matchTextToVaultWords("It is well-known", [knownVault]);
      expect(result.some((item) => item.word === "well-known")).toBe(true);
    });

    it("não gera falso positivo entre palavras distintas", () => {
      const helpVault = createVault(4, "Test", [{ id: 4, name: "help" }]);
      const resultados = matchTextToVaultWords("hello world", [helpVault]);
      expect(resultados).toHaveLength(0);
    });
  });

  describe("highlight helpers", () => {
    it("cria e parseia marcadores com hífen", () => {
      const marker = createHighlightMarker("well-known");
      expect(parseHighlightMarker(marker)).toBe("well-known");
    });

    it("divide conteúdo com marcadores", () => {
      const marker = createHighlightMarker("running");
      const content = `She is ${marker} fast`;
      const parts = splitHighlightParts(content);
      expect(parts).toHaveLength(3);
      expect(parseHighlightMarker(parts[1])).toBe("running");
    });

    it("escapa caracteres especiais de regex", () => {
      expect(escapeRegExp("a.b")).toBe("a\\.b");
    });
  });
});
