import {
  countWords,
  splitBookChapters,
  type ImportedChapter,
} from "@word-map/shared";

export type { ImportedChapter };

export type PdfImportDraft = {
  suggestedTitle: string;
  pageCount: number;
  rawLength: number;
  chapters: ImportedChapter[];
};

function joinPageItems(
  items: Array<{ str?: string; transform?: number[]; hasEOL?: boolean }>
): string {
  let text = "";
  let lastY: number | undefined;

  for (const item of items) {
    const value = item.str ?? "";
    if (!value) continue;
    const y = item.transform?.[5];
    if (lastY !== undefined && y !== undefined && Math.abs(y - lastY) > 2) {
      text += "\n";
    } else if (
      text &&
      !/\s$/.test(text) &&
      !text.endsWith("-") &&
      !/^\s/.test(value)
    ) {
      text += " ";
    }
    text += value;
    if (item.hasEOL) text += "\n";
    if (y !== undefined) lastY = y;
  }

  return text;
}

export function titleFromPdfFilename(filename: string): string {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrai texto de um PDF no browser (sem OCR / sem IA). */
export async function importPdfFile(file: File): Promise<PdfImportDraft> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items as Array<{
      str?: string;
      transform?: number[];
      hasEOL?: boolean;
    }>;
    pages.push(joinPageItems(items));
  }

  const raw = pages.join("\n\n");
  const chapters = splitBookChapters(raw);

  return {
    suggestedTitle: titleFromPdfFilename(file.name) || "Livro importado",
    pageCount: doc.numPages,
    rawLength: raw.length,
    chapters,
  };
}

export function chapterStats(chapters: ImportedChapter[]) {
  const words = chapters.reduce((sum, chapter) => sum + countWords(chapter.content), 0);
  return { chapterCount: chapters.length, words };
}
