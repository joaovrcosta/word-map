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
  return words[words.length - 1] ?? null;
}

export function wordAtChar(words: TimedWord[], charIndex: number): TimedWord | null {
  if (words.length === 0) return null;
  return (
    words.find((word) => charIndex >= word.start && charIndex < word.end) ??
    words.find((word) => word.start >= charIndex) ??
    words[words.length - 1] ??
    null
  );
}
