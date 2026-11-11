import {
  sentenceRanges,
  type ReadingPage,
} from "./reading-pages";

/** Teto do parágrafo enviado ao tutor (alinha com a API). */
export const CONTEXT_CHAR_LIMIT = 4000;
const SPAN_LIMIT = 200;
const SENTENCE_LIMIT = 2000;
const PREVIOUS_LIMIT = 4000;

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
  const span = input.span.trim().slice(0, SPAN_LIMIT);
  if (!span) return { ok: false, reason: "empty" };

  const page = input.pages[input.pageIndex];
  if (!page) return { ok: false, reason: "not_found" };

  const spanStart =
    input.spanStartInPage ?? locateSpan(page.text, span);
  if (spanStart < 0) return { ok: false, reason: "not_found" };

  const located = locateInPage(page, spanStart);
  if (!located) return { ok: false, reason: "not_found" };

  const fullParagraph = input.paragraphs[located.paragraphIndex];
  if (!fullParagraph) return { ok: false, reason: "not_found" };

  const ranges = sentenceRanges(fullParagraph);
  const sentenceRange =
    ranges.find(
      (range) =>
        located.offsetInParagraph >= range.start &&
        located.offsetInParagraph < range.end
    ) ?? ranges[0];
  if (!sentenceRange) return { ok: false, reason: "not_found" };

  // Em ebooks/PDF a “frase” pode ser um bloco enorme sem pontos —
  // centraliza o recorte na palavra tocada, não no início do bloco.
  const spanInParagraph = located.offsetInParagraph;
  const spanEnd = Math.min(
    fullParagraph.length,
    spanInParagraph + Math.max(span.length, 1)
  );
  const rawSentence = fullParagraph.slice(sentenceRange.start, sentenceRange.end);
  const spanInSentence = Math.max(0, spanInParagraph - sentenceRange.start);
  const sentence = clipAround(
    rawSentence,
    spanInSentence,
    spanInSentence + Math.max(span.length, 1),
    SENTENCE_LIMIT
  );
  const isFirstSentence =
    ranges.length === 0 || sentenceRange.start === ranges[0].start;
  const slice = page.slices.find(
    (item) => item.paragraphIndex === located.paragraphIndex
  );
  const includePrevious =
    isFirstSentence &&
    !slice?.continues &&
    located.paragraphIndex > 0;

  const paragraph = clipAround(
    fullParagraph,
    spanInParagraph,
    spanEnd,
    CONTEXT_CHAR_LIMIT
  );

  let previousParagraph: string | null = null;
  if (includePrevious) {
    const rawPrevious = input.paragraphs[located.paragraphIndex - 1] ?? null;
    if (rawPrevious) {
      const room = Math.min(
        PREVIOUS_LIMIT,
        Math.max(0, CONTEXT_CHAR_LIMIT - paragraph.length)
      );
      previousParagraph =
        room > 0
          ? rawPrevious.length <= room
            ? rawPrevious
            : rawPrevious.slice(Math.max(0, rawPrevious.length - room))
          : null;
    }
  }

  return {
    ok: true,
    span,
    sentence,
    paragraph,
    previousParagraph,
  };
}

/** Janela centrada no foco (frase/span), sem estourar o teto. */
function clipAround(
  text: string,
  focusStart: number,
  focusEnd: number,
  max: number
): string {
  if (text.length <= max) return text;
  const start = Math.max(0, Math.min(focusStart, text.length));
  const end = Math.max(start, Math.min(focusEnd, text.length));
  const focusLen = Math.max(1, end - start);
  if (focusLen >= max) return text.slice(start, start + max);

  const pad = Math.floor((max - focusLen) / 2);
  let from = Math.max(0, start - pad);
  let to = from + max;
  if (to > text.length) {
    to = text.length;
    from = Math.max(0, to - max);
  }
  return text.slice(from, to);
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
