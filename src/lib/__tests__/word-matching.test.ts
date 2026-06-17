import {
  canonicalizePhrasalBigram,
  lemmatizeWord,
  getLemmaForms,
  getPhraseMatchKeys,
  matchTextToVaultWords,
  resolveSelectionForSave,
} from "../word-matching.server";
import {
  buildBigramSurface,
  buildNgramSurface,
  createHighlightMarker,
  escapeRegExp,
  extractTextTokenStream,
  extractTextTokens,
  isTwoWordPhrase,
  isValidSelectionForSave,
  normalizeToken,
  parseHighlightMarker,
  parseSelectionTokens,
  splitHighlightParts,
  splitTwoWordPhrase,
  type MatchableVault,
} from "../word-matching";

jest.mock("@/lib/dictionary", () => ({
  fetchDictionaryEntry: jest.fn(),
  extractDictionaryTranslations: jest.fn(
    (_entry: unknown, fallback: string) => [fallback]
  ),
  extractDictionaryGrammaticalClass: jest.fn(() => "verb"),
}));

jest.mock("@/lib/translate.server", () => ({
  translateToPortugueseServer: jest.fn(async (text: string) => `pt:${text}`),
}));

import {
  extractDictionaryGrammaticalClass,
  fetchDictionaryEntry,
} from "@/lib/dictionary";

const createVault = (
  id: number,
  name: string,
  words: Array<{ id: number; name: string; grammaticalClass?: string }>
): MatchableVault => ({
  id,
  name,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  userId: 1,
  words: words.map((word) => ({
    ...word,
    grammaticalClass: word.grammaticalClass ?? "verb",
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

  describe("selection helpers", () => {
    it("extrai tokens da seleção ignorando pontuação", () => {
      expect(parseSelectionTokens("shook up,")).toEqual(["shook", "up"]);
      expect(parseSelectionTokens("in the meantime")).toEqual([
        "in",
        "the",
        "meantime",
      ]);
    });

    it("valida seleções de 2 ou 3 palavras", () => {
      expect(isValidSelectionForSave(["shook", "up"])).toBe(true);
      expect(isValidSelectionForSave(["in", "the", "meantime"])).toBe(true);
      expect(isValidSelectionForSave(["word"])).toBe(false);
      expect(isValidSelectionForSave(["a", "b", "c", "d"])).toBe(false);
    });

    it("monta n-gramas a partir do stream de tokens", () => {
      const tokens = extractTextTokenStream("in the meantime");
      expect(buildNgramSurface(tokens, 0, 3)).toBe("in the meantime");
    });
  });

  describe("resolveSelectionForSave", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("resolve phrasal verb para forma canônica", async () => {
      const result = await resolveSelectionForSave("shook up", "phrasal-verb");
      expect(result.name).toBe("shake up");
      expect(result.grammaticalClass).toBe("phrasal-verb");
      expect(fetchDictionaryEntry).toHaveBeenCalledWith("shake up");
    });

    it("rejeita phrasal verb inválido", async () => {
      await expect(
        resolveSelectionForSave("new york", "phrasal-verb")
      ).rejects.toThrow("não é um phrasal verb válido");
    });

    it("resolve frase com tradução", async () => {
      const result = await resolveSelectionForSave(
        "in the meantime",
        "frase"
      );
      expect(result.name).toBe("in the meantime");
      expect(result.grammaticalClass).toBe("frase");
      expect(result.translations).toEqual(["pt:in the meantime"]);
    });

    it("resolve palavra multi-palavra", async () => {
      (extractDictionaryGrammaticalClass as jest.Mock).mockReturnValueOnce(
        "noun"
      );
      const result = await resolveSelectionForSave("new york", "word");
      expect(result.name).toBe("new york");
      expect(result.grammaticalClass).toBe("noun");
      expect(fetchDictionaryEntry).toHaveBeenCalledWith("new york");
    });
  });

  describe("phrasal helpers", () => {
    it("identifica frases de duas palavras", () => {
      expect(isTwoWordPhrase("look up")).toBe(true);
      expect(isTwoWordPhrase("look-up")).toBe(true);
      expect(isTwoWordPhrase("running")).toBe(false);
    });

    it("canonicaliza bigramas verbo + partícula", () => {
      expect(canonicalizePhrasalBigram("looked", "up")).toBe("look up");
      expect(canonicalizePhrasalBigram("gave", "in")).toBe("give in");
      expect(canonicalizePhrasalBigram("the", "up")).toBe("the up");
    });

    it("gera chaves de match para phrasal verbs do vault", () => {
      expect(getPhraseMatchKeys("look up")).toEqual(["look up"]);
      expect(getPhraseMatchKeys("look-up")).toEqual(["look up"]);
    });

    it("monta bigramas a partir do stream de tokens", () => {
      const tokens = extractTextTokenStream("He looked up the word");
      expect(splitTwoWordPhrase("looked up")).toEqual(["looked", "up"]);
      expect(buildBigramSurface(tokens, 1)).toBe("looked up");
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

    it("encontra phrasal verb flexionado", () => {
      const phrasalVault = createVault(5, "Phrasal", [
        { id: 5, name: "look up" },
      ]);
      const result = matchTextToVaultWords("He looked up the word", [
        phrasalVault,
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].word).toBe("looked up");
      expect(result[0].vaultInfo[0].words[0].name).toBe("look up");
    });

    it("encontra phrasal verb na forma base", () => {
      const phrasalVault = createVault(6, "Phrasal", [
        { id: 6, name: "look up" },
      ]);
      const result = matchTextToVaultWords("Please look up the answer", [
        phrasalVault,
      ]);
      expect(result.some((item) => item.word === "look up")).toBe(true);
    });

    it("encontra outra flexão de phrasal verb", () => {
      const phrasalVault = createVault(7, "Phrasal", [
        { id: 7, name: "give in" },
      ]);
      const result = matchTextToVaultWords("He finally gave in", [phrasalVault]);
      expect(result.some((item) => item.word === "gave in")).toBe(true);
    });

    it("não gera falso positivo para bigramas irrelevantes", () => {
      const phrasalVault = createVault(8, "Phrasal", [
        { id: 8, name: "look up" },
      ]);
      const result = matchTextToVaultWords("The up side", [phrasalVault]);
      expect(result).toHaveLength(0);
    });

    it("encontra phrasal verb salvo com hífen no vault", () => {
      const phrasalVault = createVault(9, "Phrasal", [
        { id: 9, name: "look-up" },
      ]);
      const result = matchTextToVaultWords("She looked up", [phrasalVault]);
      expect(result.some((item) => item.word === "looked up")).toBe(true);
    });

    it("encontra frase salva no vault", () => {
      const fraseVault = createVault(10, "Frases", [
        { id: 10, name: "in the meantime", grammaticalClass: "frase" },
      ]);
      const result = matchTextToVaultWords("Wait in the meantime please", [
        fraseVault,
      ]);
      expect(result.some((item) => item.word === "in the meantime")).toBe(true);
    });

    it("encontra palavra multi-palavra salva no vault", () => {
      const cityVault = createVault(11, "Places", [
        { id: 11, name: "new york", grammaticalClass: "substantivo" },
      ]);
      const result = matchTextToVaultWords("Travel to New York today", [
        cityVault,
      ]);
      expect(result.some((item) => item.word === "New York")).toBe(true);
    });
  });

  describe("highlight helpers", () => {
    it("cria e parseia marcadores com hífen", () => {
      const marker = createHighlightMarker("well-known");
      expect(parseHighlightMarker(marker)).toBe("well-known");
    });

    it("cria e parseia marcadores com espaço", () => {
      const marker = createHighlightMarker("looked up");
      expect(parseHighlightMarker(marker)).toBe("looked up");
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
