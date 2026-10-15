export const SPEECH_RATE = 0.92;

export type SpokenRange = { start: number; end: number };

export type TimedWord = { start: number; end: number; ms: number };

export function locateSentenceStarts(text: string, sentences: string[]): number[] {
  const starts: number[] = [];
  let cursor = 0;
  for (const sentence of sentences) {
    const at = text.indexOf(sentence, cursor);
    const start = at < 0 ? cursor : at;
    starts.push(start);
    cursor = start + sentence.length;
  }
  return starts;
}

export function timedWords(sentence: string, rate = SPEECH_RATE): TimedWord[] {
  const words: TimedWord[] = [];
  const charsPerSecond = 13 * rate;
  for (const match of sentence.matchAll(/\S+/g)) {
    const surface = match[0];
    const start = match.index ?? 0;
    let ms = (Math.max(surface.length, 1) / charsPerSecond) * 1000 + 70;
    if (/[.!?…]["”’']*$/.test(surface)) ms += 200;
    else if (/[,;:]["”’']*$/.test(surface)) ms += 80;
    words.push({
      start,
      end: start + surface.length,
      ms: Math.max(150, ms),
    });
  }
  return words;
}

export function wordAtElapsed(words: TimedWord[], elapsedMs: number): TimedWord | null {
  if (words.length === 0) return null;
  let elapsed = 0;
  for (const word of words) {
    elapsed += word.ms;
    if (elapsedMs < elapsed) return word;
  }
  return words[words.length - 1];
}

export function wordAtChar(words: TimedWord[], charIndex: number): TimedWord | null {
  if (words.length === 0) return null;
  return (
    words.find((word) => charIndex >= word.start && charIndex < word.end) ??
    words.find((word) => word.start >= charIndex) ??
    words[words.length - 1]
  );
}

export function paintSpokenWord(root: ParentNode, range: SpokenRange | null) {
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
