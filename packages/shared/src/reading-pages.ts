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

/** Cabeçalhos/rodapés típicos de PDF: "3", "Letter I", "4 Letter I", "Letter I 5". */
function isPageDebris(line: string): boolean {
  const value = line.trim();
  if (!value) return false;
  if (/^\d{1,4}$/.test(value)) return true;
  if (/^(letter|chapter|volume|part|book)\s+[ivxlcdm\d]+$/i.test(value)) return true;
  if (/^\d{1,4}\s+(letter|chapter|volume|part|book)\s+[ivxlcdm\d]+$/i.test(value)) {
    return true;
  }
  if (/^(letter|chapter|volume|part|book)\s+[ivxlcdm\d]+\s+\d{1,4}$/i.test(value)) {
    return true;
  }
  return false;
}

function endsSentenceLine(line: string): boolean {
  return /[.!?]["'”’»]?$/.test(line.trim());
}

function startsParagraphLine(line: string): boolean {
  return /^["“‘']?[A-ZÀ-ÖØ-Þ]/.test(line.trim());
}

/**
 * Normaliza texto colado de PDF/e-book: remove lixo de página,
 * desfaz quebras de linha no meio da frase e recompõe parágrafos.
 */
export function formatChapterContent(raw: string): string {
  if (!raw.trim()) return "";

  const lines = raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim());

  const kept: Array<string | null> = [];
  for (const line of lines) {
    if (!line) {
      if (kept.length > 0 && kept[kept.length - 1] !== null) kept.push(null);
      continue;
    }
    if (isPageDebris(line)) continue;
    kept.push(line);
  }

  while (kept.length > 0 && kept[0] === null) kept.shift();
  while (kept.length > 0 && kept[kept.length - 1] === null) kept.pop();

  const lengths = kept
    .filter((line): line is string => typeof line === "string")
    .map((line) => line.length);
  const sorted = [...lengths].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 60;
  const shortLine = Math.max(42, Math.round(median * 0.68));

  const paragraphs: string[] = [];
  let buffer = "";

  const flush = () => {
    const text = buffer.replace(/\s+/g, " ").trim();
    if (text) paragraphs.push(text);
    buffer = "";
  };

  for (let index = 0; index < kept.length; index += 1) {
    const line = kept[index];
    if (line === null) {
      flush();
      continue;
    }

    if (!buffer) {
      buffer = line;
    } else if (/[A-Za-zÀ-ÖØ-öø-ÿ]-$/.test(buffer) && /^[a-zà-öø-ÿ]/.test(line)) {
      buffer = `${buffer.slice(0, -1)}${line}`;
    } else {
      buffer = `${buffer} ${line}`;
    }

    const next = kept[index + 1];
    if (next === null || next === undefined) {
      flush();
      continue;
    }
    if (
      typeof next === "string" &&
      endsSentenceLine(line) &&
      line.length <= shortLine &&
      startsParagraphLine(next)
    ) {
      flush();
    }
  }

  flush();
  return paragraphs.join("\n\n");
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

function fallbackSentenceRanges(
  text: string
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const pattern = /[^.!?…]+(?:[.!?…]+|$)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const raw = match[0];
    if (!raw.trim()) continue;
    ranges.push({ start: match.index, end: match.index + raw.length });
  }
  return ranges.length ? ranges : [{ start: 0, end: text.length }];
}

export function sentenceRanges(
  text: string
): Array<{ start: number; end: number }> {
  if (!text.trim()) return [];
  if (typeof Intl === "undefined" || typeof Intl.Segmenter !== "function") {
    return fallbackSentenceRanges(text);
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

function slicesFromUnits(paragraphs: string[], units: SentenceUnit[]): PageSlice[] {
  const slices: PageSlice[] = [];
  for (const unit of units) {
    const paragraph = paragraphs[unit.paragraphIndex];
    const last = slices[slices.length - 1];
    if (last && last.paragraphIndex === unit.paragraphIndex) {
      last.text = paragraph.slice(last.startOffset, unit.end);
      continue;
    }
    slices.push({
      paragraphIndex: unit.paragraphIndex,
      startOffset: unit.start,
      text: paragraph.slice(unit.start, unit.end),
      continues: unit.start > 0,
    });
  }
  return slices;
}

function pageFromSlices(slices: PageSlice[]): ReadingPage {
  const text = slices.map((slice) => slice.text).join("\n\n");
  return { text, wordCount: countWords(text), slices };
}

/**
 * Estima a altura de um bloco de texto com quebra de linha (sem medir no DOM/RN).
 * Usado por `paginateReadingToFit` no mobile quando não há probe síncrono.
 */
export function estimateWrappedTextHeight(
  text: string,
  width: number,
  fontSize: number,
  lineHeight: number,
  avgCharFactor = 0.52
): number {
  if (width <= 0 || fontSize <= 0 || lineHeight <= 0) return Number.POSITIVE_INFINITY;
  const trimmed = text.trim();
  if (!trimmed) return lineHeight;

  const maxChars = Math.max(1, Math.floor(width / (fontSize * avgCharFactor)));
  const blocks = trimmed.split(/\n+/);
  let totalLines = 0;
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]!.replace(/\s+/g, " ").trim();
    if (!block) {
      totalLines += 1;
      continue;
    }
    totalLines += Math.max(1, Math.ceil(block.length / maxChars));
    if (index < blocks.length - 1) totalLines += 1;
  }
  return totalLines * lineHeight;
}

export function paginateReadingToFit(
  content: string,
  fits: (text: string, pageIndex: number) => boolean
): ReadingPage[] {
  const paragraphs = splitParagraphs(content);
  if (paragraphs.length === 0) {
    return [{ text: "", wordCount: 0, slices: [] }];
  }

  const units = sentenceUnits(paragraphs);
  const pages: ReadingPage[] = [];
  let cursor = 0;
  let pageIndex = 0;

  while (cursor < units.length) {
    let low = cursor;
    let high = units.length - 1;
    let best = cursor;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const text = pageFromSlices(
        slicesFromUnits(paragraphs, units.slice(cursor, mid + 1))
      ).text;
      if (mid === cursor || fits(text, pageIndex)) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    pages.push(
      pageFromSlices(slicesFromUnits(paragraphs, units.slice(cursor, best + 1)))
    );
    cursor = best + 1;
    pageIndex += 1;
  }

  return pages;
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
