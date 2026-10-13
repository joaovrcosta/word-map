import {
  sentenceRanges,
  type ReadingPage,
} from "./reading-pages";

export const CONTEXT_CHAR_LIMIT = 4000;

export type ReadingContext = {
  ok: true;
  span: string;
  sentence: string;
  paragraph: string;
  previousParagraph: string | null;
};

export type ReadingContextFailure = {
  ok: false;
  reason: "empty" | "not_found" | "too_long";
};

export function buildReadingContext(input: {
  paragraphs: string[];
  pages: ReadingPage[];
  pageIndex: number;
  span: string;
  spanStartInPage?: number;
}): ReadingContext | ReadingContextFailure {
  const span = input.span.trim();
  if (!span) return { ok: false, reason: "empty" };

  const page = input.pages[input.pageIndex];
  if (!page) return { ok: false, reason: "not_found" };

  const spanStart =
    input.spanStartInPage ?? locateSpan(page.text, span);
  if (spanStart < 0) return { ok: false, reason: "not_found" };

  const located = locateInPage(page, spanStart);
  if (!located) return { ok: false, reason: "not_found" };

  const paragraph = input.paragraphs[located.paragraphIndex];
  if (!paragraph) return { ok: false, reason: "not_found" };

  const ranges = sentenceRanges(paragraph);
  const sentenceRange =
    ranges.find(
      (range) =>
        located.offsetInParagraph >= range.start &&
        located.offsetInParagraph < range.end
    ) ?? ranges[0];
  if (!sentenceRange) return { ok: false, reason: "not_found" };

  const sentence = paragraph.slice(sentenceRange.start, sentenceRange.end);
  const isFirstSentence = ranges.length === 0 || sentenceRange.start === ranges[0].start;
  const slice = page.slices.find(
    (item) => item.paragraphIndex === located.paragraphIndex
  );
  const includePrevious =
    isFirstSentence &&
    !slice?.continues &&
    located.paragraphIndex > 0;

  const previousParagraph = includePrevious
    ? input.paragraphs[located.paragraphIndex - 1] ?? null
    : null;

  const size =
    span.length +
    sentence.length +
    paragraph.length +
    (previousParagraph?.length ?? 0);
  if (size > CONTEXT_CHAR_LIMIT) return { ok: false, reason: "too_long" };

  return {
    ok: true,
    span,
    sentence,
    paragraph,
    previousParagraph,
  };
}

function locateSpan(pageText: string, span: string): number {
  const haystack = pageText.toLowerCase();
  const direct = haystack.indexOf(span.toLowerCase());
  if (direct !== -1) return direct;
  const firstToken = span.split(/\s+/).find(Boolean);
  if (!firstToken) return -1;
  return haystack.indexOf(firstToken.toLowerCase());
}

function locateInPage(
  page: ReadingPage,
  offsetInPage: number
): { paragraphIndex: number; offsetInParagraph: number } | null {
  let cursor = 0;
  for (let index = 0; index < page.slices.length; index += 1) {
    const slice = page.slices[index];
    const start = cursor;
    const end = cursor + slice.text.length;
    if (offsetInPage >= start && offsetInPage < end) {
      return {
        paragraphIndex: slice.paragraphIndex,
        offsetInParagraph: slice.startOffset + (offsetInPage - start),
      };
    }
    cursor = end + (index < page.slices.length - 1 ? 2 : 0);
  }
  if (page.slices.length === 0) return null;
  const last = page.slices[page.slices.length - 1];
  return {
    paragraphIndex: last.paragraphIndex,
    offsetInParagraph: last.startOffset + Math.max(0, last.text.length - 1),
  };
}
