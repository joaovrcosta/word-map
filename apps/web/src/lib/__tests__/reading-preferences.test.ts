import {
  DEFAULT_READING_PREFERENCES,
  parseReadingPreferences,
} from "@word-map/shared";

describe("parseReadingPreferences", () => {
  it("retorna defaults para JSON corrompido", () => {
    expect(parseReadingPreferences("{not-json")).toEqual(DEFAULT_READING_PREFERENCES);
  });

  it("retorna defaults para null e tipos inválidos", () => {
    expect(parseReadingPreferences(null)).toEqual(DEFAULT_READING_PREFERENCES);
    expect(parseReadingPreferences(42)).toEqual(DEFAULT_READING_PREFERENCES);
    expect(parseReadingPreferences([])).toEqual(DEFAULT_READING_PREFERENCES);
  });

  it("ignora fonte fora do conjunto e cai no default", () => {
    expect(parseReadingPreferences({ fontSize: 20 }).fontSize).toBe(18);
    expect(parseReadingPreferences({ fontSize: "22" }).fontSize).toBe(18);
  });

  it("aceita fontes válidas", () => {
    expect(parseReadingPreferences({ fontSize: 22 }).fontSize).toBe(22);
    expect(parseReadingPreferences({ fontSize: 26 }).fontSize).toBe(26);
  });

  it("ignora tema inválido", () => {
    expect(parseReadingPreferences({ theme: "sepia" }).theme).toBe("dark");
    expect(parseReadingPreferences({ theme: "light" }).theme).toBe("light");
    expect(parseReadingPreferences({ theme: "auto" }).theme).toBe("auto");
  });

  it("preenche campos ausentes com defaults", () => {
    expect(parseReadingPreferences({ fontSize: 26 })).toEqual({
      ...DEFAULT_READING_PREFERENCES,
      fontSize: 26,
    });
  });

  it("aceita string JSON válida", () => {
    expect(
      parseReadingPreferences(JSON.stringify({ theme: "light", autoSaveWords: true }))
    ).toEqual({
      ...DEFAULT_READING_PREFERENCES,
      theme: "light",
      autoSaveWords: true,
    });
  });
});
