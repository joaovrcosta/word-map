export type WordOriginKind = "book" | "text" | "manual";

export type WordOriginInput = {
  sentence?: string | null;
  sourceTitle?: string | null;
  sourceKind?: WordOriginKind;
};

export function normalizeOriginText(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function sameWordOrigin(
  existing: { sentence: string | null; meaning: string },
  next: { sentence: string | null; meaning: string }
): boolean {
  return (
    normalizeOriginText(existing.meaning) === normalizeOriginText(next.meaning) &&
    normalizeOriginText(existing.sentence) === normalizeOriginText(next.sentence)
  );
}

export function addedMeanings(previous: string[], next: string[]): string[] {
  return next.filter(
    (item) =>
      !previous.some(
        (current) => normalizeOriginText(current) === normalizeOriginText(item)
      )
  );
}

export function formatOriginDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}
