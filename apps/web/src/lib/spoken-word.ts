export {
  SPEECH_RATE,
  locateSentenceStarts,
  timedWords,
  wordAtChar,
  wordAtElapsed,
  type SpokenRange,
  type TimedWord,
} from "@word-map/shared";

export function paintSpokenWord(
  root: ParentNode,
  range: { start: number; end: number } | null
) {
  root.querySelectorAll(".spoken-word").forEach((node) => {
    node.classList.remove("spoken-word");
  });
  if (!range) return;

  const nodes = root.querySelectorAll<HTMLElement>("[data-word-start]");
  for (const node of nodes) {
    const start = Number(node.dataset.wordStart);
    const end = Number(node.dataset.wordEnd);
    if (Number.isNaN(start) || Number.isNaN(end)) continue;
    if (start < range.end && end > range.start) {
      node.classList.add("spoken-word");
      const rect = node.getBoundingClientRect();
      if (rect.height > 0 && (rect.bottom < 72 || rect.top > window.innerHeight - 24)) {
        node.scrollIntoView({ block: "nearest" });
      }
      return;
    }
  }
}
