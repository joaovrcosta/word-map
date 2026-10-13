import {
  grammarClassLabel,
  grammarGuidePath,
  resolveGrammarSlug,
} from "../grammar-guide";

describe("grammar guide", () => {
  it("reconhece a tag em português e em inglês", () => {
    expect(resolveGrammarSlug("substantivo")).toBe("substantivo");
    expect(resolveGrammarSlug("Noun")).toBe("substantivo");
    expect(resolveGrammarSlug("phrasal verb")).toBe("phrasal-verb");
  });

  it("monta o caminho da explicação", () => {
    expect(grammarGuidePath("verbo")).toBe("/home/gramatica/verbo");
    expect(grammarClassLabel("adverb")).toBe("Advérbio");
  });

  it("não inventa uma classe desconhecida", () => {
    expect(resolveGrammarSlug("foo")).toBeNull();
    expect(grammarGuidePath("foo")).toBeNull();
  });
});