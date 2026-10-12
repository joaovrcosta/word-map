import { buildReadingContext } from "../reading-context";
import {
  paginateReading,
  splitParagraphs,
  type ReadingPage,
} from "../reading-pages";

function words(count: number, label: string): string {
  return Array.from({ length: count }, (_, index) =>
    index === 0 ? `${label} starts here` : `${label}${index}`
  ).join(" ");
}

function contextFor(
  content: string,
  span: string,
  pageIndex: number,
  wordTarget = 200,
  spanStartInPage?: number
) {
  const paragraphs = splitParagraphs(content);
  const pages = paginateReading(content, wordTarget);
  return {
    pages,
    result: buildReadingContext({
      paragraphs,
      pages,
      pageIndex,
      span,
      spanStartInPage,
    }),
  };
}

describe("buildReadingContext", () => {
  it("usa o parágrafo original quando a página só mostra um pedaço", () => {
    const first = `${words(40, "Early")}.`;
    const second = `${words(40, "Later")}.`;
    const content = `${first} ${second}`;
    const { pages, result } = contextFor(content, "Later", 1, 30);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages[1].text.length).toBeLessThan(content.length);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.paragraph).toBe(content);
    expect(result.previousParagraph).toBeNull();
    expect(result.sentence.startsWith("Later")).toBe(true);
  });

  it("inclui o parágrafo anterior na primeira frase de um parágrafo novo", () => {
    const content = [
      "Yesterday Watson arrived from London.",
      "Mr. Holmes said nothing about the moor. Then he looked up the lane.",
      "UNIQUE_LATER_MARKER stays outside the window.",
    ].join("\n\n");
    const { result } = contextFor(content, "Mr. Holmes", 0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.sentence).toBe("Mr. Holmes said nothing about the moor.");
    expect(result.previousParagraph).toBe(
      "Yesterday Watson arrived from London."
    );
    expect(result.paragraph).not.toContain("UNIQUE_LATER_MARKER");
    expect(result.sentence).not.toContain("UNIQUE_LATER_MARKER");
    expect(result.previousParagraph).not.toContain("UNIQUE_LATER_MARKER");
  });

  it("não trata a continuação de um parágrafo como parágrafo novo", () => {
    const content = `${words(30, "Keep")}. ${words(30, "Next")}.`;
    const { pages, result } = contextFor(content, "Next", 1, 20);
    expect(pages[1].slices[0].continues).toBe(true);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.previousParagraph).toBeNull();
  });

  it("usa a frase do início quando a seleção cruza duas frases", () => {
    const content = "Mr. Holmes said nothing. Dr. Mortimer looked up the path.";
    const pages = paginateReading(content);
    const span = "nothing. Dr. Mortimer";
    const spanStartInPage = pages[0].text.indexOf("nothing");
    const result = buildReadingContext({
      paragraphs: splitParagraphs(content),
      pages,
      pageIndex: 0,
      span,
      spanStartInPage,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.span).toBe(span);
    expect(result.sentence).toBe("Mr. Holmes said nothing.");
  });

  it("aceita um phrasal verb como span", () => {
    const content = "Then he looked up the lane and smiled.";
    const { result } = contextFor(content, "looked up", 0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.span).toBe("looked up");
    expect(result.sentence).toContain("looked up");
  });

  it("recusa payload acima do teto", () => {
    const content = `${"word ".repeat(4500)}.`;
    const { result } = contextFor(content, "word", 0);
    expect(result).toEqual({ ok: false, reason: "too_long" });
  });

  it("recusa span vazio", () => {
    const pages: ReadingPage[] = paginateReading("Holmes waited.");
    expect(
      buildReadingContext({
        paragraphs: ["Holmes waited."],
        pages,
        pageIndex: 0,
        span: "   ",
      })
    ).toEqual({ ok: false, reason: "empty" });
  });
});
