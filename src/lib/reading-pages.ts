export const PAGE_WORD_TARGET = 200;

const ABBREVIATIONS =
  /(?:^|[\s"“‘])(Mr|Mrs|Ms|Dr|St|Sr|Jr|Prof|Sir)\.\s*$/i;

export type PageSlice = {
  paragraphIndex: number;
  startOffset: number;
  text: string;
  continues: boolean;
};

export type ReadingPage = {
  text: string;
  wordCount: number;
  slices: PageSlice[];
};

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function splitParagraphs(content: string): string[] {
  if (!content.trim()) return [];
  return content
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function endsWithAbbreviation(value: string): boolean {
  return ABBREVIATIONS.test(value.trim().replace(/["”’']+$/g, ""));
}

function isClosingQuoteFragment(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^["”’']+$/.test(trimmed)) return true;
  return /^["”’']+$/.test(trimmed) || /^["”’'][.!?]?$/.test(trimmed);
}

function shouldAttach(previous: string, next: string): boolean {
  if (endsWithAbbreviation(previous)) return true;
  if (isClosingQuoteFragment(next)) return true;
  const nextTrimmed = next.trim();
  const opensNewSentence = /^["“‘][A-Za-z0-9]/.test(nextTrimmed);
  if (opensNewSentence) return false;
  return /[.!?]\s*$/.test(previous) && /^["”’']/.test(nextTrimmed);
}

export function sentenceRanges(
  text: string
): Array<{ start: number; end: number }> {
  if (!text.trim()) return [];
  if (typeof Intl === "undefined" || typeof Intl.Segmenter !== "function") {
    return [{ start: 0, end: text.length }];
  }

  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  const parts = Array.from(segmenter.segment(text), (part) => ({
    start: part.index,
    end: part.index + part.segment.length,
  }));

  const merged: Array<{ start: number; end: number }> = [];
  for (const part of parts) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      shouldAttach(
        text.slice(previous.start, previous.end),
        text.slice(part.start, part.end)
      )
    ) {
      previous.end = part.end;
      continue;
    }
    merged.push({ start: part.start, end: part.end });
  }

  return merged
    .map((range) => {
      let start = range.start;
      let end = range.end;
      while (start < end && /\s/.test(text[start])) start += 1;
      while (end > start && /\s/.test(text[end - 1])) end -= 1;
      return { start, end };
    })
    .filter((range) => range.end > range.start);
}

export function splitSentences(text: string): string[] {
  return sentenceRanges(text).map((range) => text.slice(range.start, range.end));
}

type SentenceUnit = {
  paragraphIndex: number;
  start: number;
  end: number;
  words: number;
};

function sentenceUnits(paragraphs: string[]): SentenceUnit[] {
  const units: SentenceUnit[] = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const ranges = sentenceRanges(paragraph);
    const usable = ranges.length
      ? ranges
      : [{ start: 0, end: paragraph.length }];
    for (const range of usable) {
      const text = paragraph.slice(range.start, range.end);
      units.push({
        paragraphIndex,
        start: range.start,
        end: range.end,
        words: countWords(text),
      });
    }
  });
  return units;
}

export function paginateReading(
  content: string,
  wordTarget = PAGE_WORD_TARGET
): ReadingPage[] {
  const paragraphs = splitParagraphs(content);
  if (paragraphs.length === 0) {
    return [{ text: "", wordCount: 0, slices: [] }];
  }

  const units = sentenceUnits(paragraphs);
  const pages: ReadingPage[] = [];
  let slices: PageSlice[] = [];
  let words = 0;

  const flush = () => {
    if (slices.length === 0) return;
    const text = slices.map((slice) => slice.text).join("\n\n");
    pages.push({ text, wordCount: countWords(text), slices });
    slices = [];
    words = 0;
  };

  for (const unit of units) {
    if (words > 0 && words + unit.words > wordTarget) {
      flush();
    }

    const paragraph = paragraphs[unit.paragraphIndex];
    const last = slices[slices.length - 1];
    if (last && last.paragraphIndex === unit.paragraphIndex) {
      const start = last.startOffset;
      last.text = paragraph.slice(start, unit.end);
      words += unit.words;
      continue;
    }

    slices.push({
      paragraphIndex: unit.paragraphIndex,
      startOffset: unit.start,
      text: paragraph.slice(unit.start, unit.end),
      continues: unit.start > 0,
    });
    words += unit.words;
  }

  flush();
  return pages.length > 0 ? pages : [{ text: "", wordCount: 0, slices: [] }];
}

export function resolveReadingPage(
  pages: ReadingPage[],
  paragraphIndex: number,
  pageIndex = 0
): number {
  if (pages.length === 0) return 0;
  const matches = pages
    .map((page, index) => ({ page, index }))
    .filter(({ page }) =>
      page.slices.some((slice) => slice.paragraphIndex === paragraphIndex)
    );
  if (matches.length === 0) return pages.length - 1;
  const hinted = matches.find((match) => match.index === pageIndex);
  if (hinted) return hinted.index;
  return matches[0].index;
}

export function normalizeReadingPosition(
  pages: ReadingPage[],
  paragraphIndex: number,
  pageIndex = 0
): { pageIndex: number; paragraphIndex: number } {
  const resolved = resolveReadingPage(pages, paragraphIndex, pageIndex);
  const page = pages[resolved];
  return {
    pageIndex: resolved,
    paragraphIndex: page?.slices[0]?.paragraphIndex ?? 0,
  };
}

export function recoverParagraphs(
  content: string,
  pages: ReadingPage[]
): string[] {
  const paragraphs = splitParagraphs(content);
  return paragraphs.map((paragraph, paragraphIndex) => {
    const slices = pages.flatMap((page) =>
      page.slices.filter((slice) => slice.paragraphIndex === paragraphIndex)
    );
    if (slices.length === 0) return paragraph;
    return slices.map((slice) => slice.text).join(" ");
  });
}
