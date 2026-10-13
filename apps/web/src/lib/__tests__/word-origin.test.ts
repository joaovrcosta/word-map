import { addedMeanings, formatOriginDate, sameWordOrigin } from "../word-origin";

describe("sameWordOrigin", () => {
  it("trata a mesma frase e o mesmo significado como o mesmo momento", () => {
    expect(
      sameWordOrigin(
        { sentence: "He asked a question.", meaning: "Perguntou" },
        { sentence: "  he asked a question. ", meaning: "perguntou" }
      )
    ).toBe(true);
  });

  it("separa outro significado na mesma frase", () => {
    expect(
      sameWordOrigin(
        { sentence: "He asked a question.", meaning: "perguntou" },
        { sentence: "He asked a question.", meaning: "pediu" }
      )
    ).toBe(false);
  });

  it("separa a mesma palavra em outra frase", () => {
    expect(
      sameWordOrigin(
        { sentence: "He asked a question.", meaning: "perguntou" },
        { sentence: "She asked for water.", meaning: "perguntou" }
      )
    ).toBe(false);
  });
});

describe("addedMeanings", () => {
  it("guarda só o significado que ainda não estava na palavra", () => {
    expect(addedMeanings(["perguntou"], ["perguntou", "pediu"])).toEqual([
      "pediu",
    ]);
  });
});

describe("formatOriginDate", () => {
  it("devolve vazio para uma data inválida", () => {
    expect(formatOriginDate("não é data")).toBe("");
  });
});
