const POSTER_TONES = [
  ["#d8f5e6", "#8ee0b4"],
  ["#d9eefc", "#8ec5ea"],
  ["#fde7d4", "#f3b183"],
  ["#f3e8ff", "#c4b5fd"],
  ["#ffe4e8", "#f4a3ad"],
  ["#e7f8ee", "#7ddea8"],
  ["#fef3c7", "#f0c14a"],
  ["#e0f2fe", "#7dd3fc"],
] as const;

export function posterTone(slug: string): readonly [string, string] {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash + slug.charCodeAt(index) * (index + 3)) % POSTER_TONES.length;
  }
  return POSTER_TONES[hash];
}
