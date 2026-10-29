import {
  buildReadingFitKey,
  bucketFitHeight,
  contentOffsetForPageAnchor,
  contentOffsetFromSlice,
  countWords,
  estimateWrappedTextHeight,
  formatChapterContent,
  splitBookChapters,
  hashNormalizedContent,
  normalizeReadingPosition,
  pageContentRange,
  paginateReading,
  paginateReadingToFit,
  recoverParagraphs,
  resolvePageByContentOffset,
  resolveReadingPage,
  safeUtf16Offset,
  splitSentences,
} from "../reading-pages";

function sentence(label: string, words: number): string {
  const tokens = Array.from({ length: Math.max(words - 1, 1) }, (_, index) =>
    index === 0
      ? `${label.charAt(0).toUpperCase()}${label.slice(1)}${index}`
      : `${label}${index}`
  );
  return `${tokens.join(" ")} end.`;
}

function paragraph(label: string, sentences: number, wordsEach: number): string {
  return Array.from({ length: sentences }, (_, index) =>
    sentence(`${label}${index}`, wordsEach)
  ).join(" ");
}

describe("paginateReading", () => {
  it("gera as mesmas páginas para a mesma entrada", () => {
    const content = `${paragraph("a", 4, 40)}\n\n${paragraph("b", 4, 40)}`;
    expect(paginateReading(content)).toEqual(paginateReading(content));
  });

  it("coloca um capítulo curto em uma página", () => {
    const content = "Mr. Holmes said nothing.\n\nDr. Mortimer waited.";
    const pages = paginateReading(content);
    expect(pages).toHaveLength(1);
    expect(pages[0].slices.map((slice) => slice.paragraphIndex)).toEqual([0, 1]);
    expect(pages[0].wordCount).toBe(countWords(content.replace(/\n+/g, " ")));
  });

  it("manda o parágrafo que não cabe para a página seguinte", () => {
    const first = paragraph("alpha", 2, 80);
    const second = paragraph("beta", 2, 80);
    const pages = paginateReading(`${first}\n\n${second}`, 100);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0].slices.every((slice) => slice.paragraphIndex === 0)).toBe(
      true
    );
    expect(pages.some((page) => page.slices.some((slice) => slice.paragraphIndex === 1))).toBe(
      true
    );
  });

  it("quebra parágrafo longo em frases e preserva o paragraphIndex", () => {
    const content = paragraph("long", 8, 40);
    const pages = paginateReading(content, 100);
    expect(splitSentences(content).length).toBeGreaterThan(1);
    expect(pages.length).toBeGreaterThan(1);
    expect(
      pages.every((page) =>
        page.slices.every((slice) => slice.paragraphIndex === 0)
      )
    ).toBe(true);
    expect(pages[1].slices[0].continues).toBe(true);
    expect(pages[1].slices[0].startOffset).toBeGreaterThan(0);
    expect(pages[0].slices[0].continues).toBe(false);
  });

  it("mantém Mr. Holmes said. em uma única frase", () => {
    const text = "Mr. Holmes said. Dr. Mortimer arrived later.";
    const sentences = splitSentences(text);
    expect(sentences.some((item) => item === "Mr. Holmes said.")).toBe(true);
    expect(sentences.some((item) => item === "Mr.")).toBe(false);
    expect(sentences.some((item) => /^Holmes said/.test(item))).toBe(false);
  });

  it("não parte fala entre aspas nem o fechamento ?", () => {
    const spoken = 'He said. "Next morning we start."';
    const spokenParts = splitSentences(spoken);
    expect(spokenParts.some((item) => item === '"' || item === "." || item === "?")).toBe(
      false
    );
    expect(spokenParts.some((item) => item.includes("Next morning we start."))).toBe(
      true
    );
    expect(
      spokenParts.find((item) => item.includes("Next morning"))?.startsWith('"')
    ).toBe(true);

    const asked = 'He asked, "Are you ready?"';
    const askedParts = splitSentences(asked);
    expect(askedParts).toEqual([asked]);
    expect(askedParts[0].includes('?"')).toBe(true);
  });

  it("mantém uma frase maior que o limite inteira", () => {
    const huge = `${Array.from({ length: 250 }, (_, index) => `word${index}`).join(" ")}.`;
    const pages = paginateReading(huge, 50);
    expect(pages).toHaveLength(1);
    expect(pages[0].text).toBe(huge);
  });

  it("devolve uma página vazia para conteúdo vazio", () => {
    expect(paginateReading("")).toEqual([
      { text: "", wordCount: 0, slices: [] },
    ]);
    expect(paginateReading("   \n  ")).toEqual([
      { text: "", wordCount: 0, slices: [] },
    ]);
  });

  it("coloca em cada página só o texto que cabe", () => {
    const content = paragraph("fit", 6, 20);
    const pages = paginateReadingToFit(content, (text) => countWords(text) <= 40);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.slice(0, -1).every((page) => page.wordCount <= 40)).toBe(true);
    expect(recoverParagraphs(content, pages)).toEqual([content]);
  });

  it("mantém sozinha a frase que não cabe na tela", () => {
    const huge = sentence("big", 80);
    const pages = paginateReadingToFit(huge, () => false);
    expect(pages).toHaveLength(1);
    expect(pages[0].text).toBe(huge);
  });

  it("estima altura de texto quebrado por largura", () => {
    const short = estimateWrappedTextHeight("Hello world", 200, 18, 26);
    const long = estimateWrappedTextHeight(
      Array.from({ length: 80 }, (_, i) => `word${i}`).join(" "),
      200,
      18,
      26
    );
    expect(short).toBeLessThan(long);
    expect(short).toBeGreaterThanOrEqual(26);
  });

  it("reconstrói os parágrafos sem perder nem duplicar texto", () => {
    const first = paragraph("keep", 6, 30);
    const second = "Sir Henry waited by the gate.";
    const third = paragraph("more", 5, 25);
    const content = `${first}\n\n${second}\n\n${third}`;
    const pages = paginateReading(content, 80);
    expect(recoverParagraphs(content, pages)).toEqual([first, second, third]);
  });
});

describe("resolveReadingPage", () => {
  const content = [paragraph("p0", 4, 40), paragraph("p1", 4, 40), paragraph("p2", 4, 40)].join(
    "\n\n"
  );
  const pages = paginateReading(content, 80);

  it("encontra a página do parágrafo mesmo com pageIndex defasado", () => {
    const target = pages.findIndex((page) =>
      page.slices.some((slice) => slice.paragraphIndex === 2)
    );
    expect(resolveReadingPage(pages, 2, 0)).toBe(target);
  });

  it("entre várias páginas do mesmo parágrafo, escolhe a mais próxima do pageIndex", () => {
    const long = paragraph("long", 20, 50);
    const multi = paginateReading(long, 60);
    expect(multi.length).toBeGreaterThan(2);
    const last = multi.length - 1;
    expect(resolveReadingPage(multi, 0, last)).toBe(last);
    expect(resolveReadingPage(multi, 0, 0)).toBe(0);
  });

  it("usa startOffset para achar a fatia certa do parágrafo", () => {
    const long = paragraph("long", 20, 50);
    const multi = paginateReading(long, 60);
    expect(multi.length).toBeGreaterThan(1);
    const mid = multi[Math.floor(multi.length / 2)]!;
    const slice = mid.slices[0]!;
    expect(resolveReadingPage(multi, slice.paragraphIndex, 0, slice.startOffset)).toBe(
      Math.floor(multi.length / 2)
    );
  });

  it("clampa pageIndex quando o parágrafo não existe", () => {
    expect(normalizeReadingPosition(pages, 99, 0)).toEqual({
      pageIndex: 0,
      paragraphIndex: pages[0].slices[0].paragraphIndex,
      startOffset: pages[0].slices[0].startOffset,
    });
    expect(normalizeReadingPosition(pages, 99, 50).pageIndex).toBe(pages.length - 1);
  });
});

describe("contentOffset helpers", () => {
  it("round-trip: offset do início da página i resolve de volta para i", () => {
    const content = [paragraph("a", 6, 40), paragraph("b", 6, 40), paragraph("c", 6, 40)].join(
      "\n\n"
    );
    const pages = paginateReading(content, 70);
    expect(pages.length).toBeGreaterThan(1);
    for (let index = 0; index < pages.length; index += 1) {
      const slice = pages[index]!.slices[0]!;
      const offset = contentOffsetFromSlice(content, slice.paragraphIndex, slice.startOffset);
      expect(resolvePageByContentOffset(pages, content, offset)).toBe(index);
    }
  });

  it("mesmo offset cobre o trecho em fits com wordTarget diferentes", () => {
    const content = paragraph("long", 24, 45);
    const fine = paginateReading(content, 50);
    const coarse = paginateReading(content, 120);
    expect(fine.length).toBeGreaterThan(coarse.length);
    const mid = fine[Math.floor(fine.length / 2)]!;
    const slice = mid.slices[0]!;
    const offset = contentOffsetFromSlice(content, slice.paragraphIndex, slice.startOffset);
    const finePage = resolvePageByContentOffset(fine, content, offset);
    const coarsePage = resolvePageByContentOffset(coarse, content, offset);
    const fineRange = pageContentRange(content, fine[finePage]!);
    const coarseRange = pageContentRange(content, coarse[coarsePage]!);
    expect(offset).toBeGreaterThanOrEqual(fineRange.start);
    expect(offset).toBeLessThan(fineRange.end);
    expect(offset).toBeGreaterThanOrEqual(coarseRange.start);
    expect(offset).toBeLessThan(coarseRange.end);
  });

  it("bordas: 0, length, separador, emoji e parágrafo gigante", () => {
    const content = `Hello 😀 world.\n\n${paragraph("giant", 30, 40)}`;
    const pages = paginateReading(content, 60);
    expect(resolvePageByContentOffset(pages, content, 0)).toBe(0);
    expect(resolvePageByContentOffset(pages, content, content.length)).toBe(pages.length - 1);
    const sep = content.indexOf("\n\n");
    expect(sep).toBeGreaterThan(0);
    const afterSep = resolvePageByContentOffset(pages, content, sep + 2);
    expect(afterSep).toBeGreaterThanOrEqual(0);
    expect(safeUtf16Offset("a😀b", 2)).toBe(1);
    expect(hashNormalizedContent(content)).toHaveLength(8);
  });

  it("anti-ratchet na última página usa content.length", () => {
    const content = paragraph("end", 8, 30);
    const pages = paginateReading(content, 40);
    const last = pages.length - 1;
    expect(contentOffsetForPageAnchor(content, pages, last)).toBe(content.length);
  });

  it("anti-ratchet no meio fica dentro da página", () => {
    const content = paragraph("mid", 20, 40);
    const pages = paginateReading(content, 50);
    expect(pages.length).toBeGreaterThan(2);
    const offset = contentOffsetForPageAnchor(content, pages, 1);
    const range = pageContentRange(content, pages[1]!);
    expect(offset).toBeGreaterThanOrEqual(range.start);
    expect(offset).toBeLessThan(range.end);
  });

  it("fit key agrupa jitter de altura em baldes de 8px", () => {
    expect(bucketFitHeight(148)).toBe(144);
    expect(bucketFitHeight(135)).toBe(128);
    expect(buildReadingFitKey(371.4, 148, 22, 1)).toBe(buildReadingFitKey(371, 145, 22, 1));
    expect(buildReadingFitKey(371, 148, 22, 1)).not.toBe(buildReadingFitKey(371, 135, 22, 1));
  });
});

describe("formatChapterContent", () => {
  it("junta quebras de PDF e remove cabeçalhos de página", () => {
    const raw = [
      "YOU will rejoice to hear that no disaster has accompanied the",
      "commencement of an enterprise which you have regarded",
      "with such evil forebodings. I arrived here yesterday; and",
      "my first task is to assure my dear sister of my welfare.",
      "",
      "These visions faded when I perused, for the first time,",
      "those poets whose effusions entranced my soul.",
      "3",
      "4 Letter I",
      "And now, dear Margaret, do I not deserve to accomplish",
      "Letter I 5",
      "some great purpose.",
      "whale-",
      "fishers sailed north.",
    ].join("\n");

    const formatted = formatChapterContent(raw);

    expect(formatted).not.toMatch(/\bLetter I\b/);
    expect(formatted).not.toMatch(/\n3\n/);
    expect(formatted).toContain("whalefishers sailed north.");
    expect(formatted).toContain(
      "YOU will rejoice to hear that no disaster has accompanied the commencement"
    );
    expect(formatted).toContain("And now, dear Margaret, do I not deserve to accomplish some great purpose.");
    expect(formatted.split("\n\n").length).toBeGreaterThanOrEqual(2);
  });

  it("é idempotente em texto já formatado", () => {
    const clean =
      "First paragraph stays together.\n\nSecond paragraph also stays together.";
    expect(formatChapterContent(clean)).toBe(clean);
  });
});

describe("splitBookChapters", () => {
  it("parte por headings Chapter N e formata o corpo", () => {
    const front = Array.from({ length: 90 }, (_, i) => `Word${i + 1}`).join(" ");
    const raw = [
      front,
      "Chapter 1",
      "Dad never drove with us to school—ever. He said the city was safer on foot.",
      "Chapter 2: The Deal",
      "We met at midnight under the bridge and waited for the signal.",
    ].join("\n");

    const chapters = splitBookChapters(raw);
    expect(chapters.map((item) => item.title)).toEqual([
      "Início",
      "Chapter 1",
      "Chapter 2: The Deal",
    ]);
    expect(chapters[1]?.content).toContain("Dad never drove");
    expect(chapters[1]?.content).not.toMatch(/^Chapter 1$/m);
    expect(chapters[2]?.content).toContain("midnight");
  });

  it("sem heading vira um único capítulo", () => {
    const chapters = splitBookChapters("Just a short story without headings.");
    expect(chapters).toHaveLength(1);
    expect(chapters[0]?.title).toBe("Capítulo 1");
    expect(chapters[0]?.content).toContain("Just a short story");
  });
});
