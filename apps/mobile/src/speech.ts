import * as Speech from "expo-speech";
import {
  timedWords,
  wordAtChar,
  wordAtElapsed,
  type SpokenRange,
} from "@word-map/shared";

const WORD_SPEECH_RATE = 0.88;
const WORD_CLOCK_MS = 80;

let speakToken = 0;
let voicePromise: Promise<string | null> | null = null;
const speakerVoices = new Map<string, string | null>();
let wordClock: ReturnType<typeof setInterval> | null = null;

function clearWordClock() {
  if (wordClock) {
    clearInterval(wordClock);
    wordClock = null;
  }
}

export function stopSpeech() {
  speakToken += 1;
  clearWordClock();
  Speech.stop();
}

function scoreVoice(voice: Speech.Voice) {
  const name = `${voice.name} ${voice.identifier}`.toLowerCase();
  let score = 0;
  if (voice.language?.toLowerCase().startsWith("en")) score += 20;
  if (voice.language?.toLowerCase().startsWith("en-us")) score += 8;
  if (name.includes("neural") || name.includes("natural") || name.includes("enhanced")) score += 30;
  if (name.includes("premium") || name.includes("quality") || name.includes("siri")) score += 18;
  if (name.includes("google") || name.includes("samsung")) score += 10;
  if (name.includes("compact") || name.includes("eloquence")) score -= 12;
  return score;
}

export type ReadingVoiceOption = {
  identifier: string;
  name: string;
  language: string;
};

/** Vozes EN ordenadas por qualidade; lista vazia se indisponível. */
export async function listEnglishVoices(): Promise<ReadingVoiceOption[]> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices
      .filter((voice) => voice.language?.toLowerCase().startsWith("en"))
      .sort((left, right) => scoreVoice(right) - scoreVoice(left))
      .map((voice) => ({
        identifier: voice.identifier,
        name: voice.name || voice.identifier,
        language: voice.language || "en",
      }));
  } catch {
    return [];
  }
}

async function pickEnglishVoice(prefer?: "higher" | "lower") {
  const english = await listEnglishVoices();
  if (english.length === 0) return null;
  if (!prefer) return english[0]?.identifier ?? null;

  const named = english.filter((voice) => {
    const name = `${voice.name} ${voice.identifier}`.toLowerCase();
    if (prefer === "higher") {
      return /samantha|karen|moira|tessa|fiona|susan|zoe|female|woman|salli|joanna|ivy|kimberly/.test(name);
    }
    return /daniel|alex|fred|arthur|aaron|male|man|matthew|justin|joey|brian/.test(name);
  });
  return (named[0] ?? english[prefer === "higher" ? 0 : Math.min(1, english.length - 1)])?.identifier ?? null;
}

async function defaultVoice() {
  if (!voicePromise) voicePromise = pickEnglishVoice();
  return voicePromise;
}

async function resolveVoice(voiceId?: string | null, speaker?: string | null) {
  if (voiceId) {
    const available = await listEnglishVoices();
    if (available.some((voice) => voice.identifier === voiceId)) return voiceId;
  }
  if (speaker) return voiceForSpeaker(speaker);
  return defaultVoice();
}

async function voiceForSpeaker(speaker?: string | null) {
  const key = speaker?.trim().toLocaleLowerCase() || "";
  if (!key) return defaultVoice();
  if (speakerVoices.has(key)) return speakerVoices.get(key) ?? null;

  const code = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const prefer = code % 2 === 0 ? "higher" : "lower";
  const voice = await pickEnglishVoice(prefer);
  speakerVoices.set(key, voice);
  return voice;
}

function pitchForSpeaker(speaker?: string | null) {
  const key = speaker?.trim().toLocaleLowerCase() || "";
  if (!key) return 1;
  const code = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return code % 2 === 0 ? 1.08 : 0.92;
}

export function speakWord(word: string, options?: { voiceId?: string | null }) {
  const mine = ++speakToken;
  clearWordClock();
  Speech.stop();
  void (async () => {
    const voice = await resolveVoice(options?.voiceId);
    if (speakToken !== mine) return;
    Speech.speak(word, {
      language: "en-US",
      rate: WORD_SPEECH_RATE,
      pitch: 1,
      voice: voice ?? undefined,
    });
  })();
}

export type SpeakPassageOptions = {
  speaker?: string | null;
  rate?: number;
  voiceId?: string | null;
  /** Range da palavra atual no texto passado a speakPassage (trim only). */
  onWord?: (range: SpokenRange | null) => void;
};

export function speakPassage(
  text: string,
  onEnd?: () => void,
  options?: SpeakPassageOptions
) {
  // Trim só nas pontas — sem colapsar whitespace, para charIndex bater com a página.
  const spoken = text.trim();
  const mine = ++speakToken;
  clearWordClock();
  Speech.stop();
  options?.onWord?.(null);
  if (!spoken) {
    onEnd?.();
    return;
  }

  const rate = options?.rate ?? 0.92;
  const words = timedWords(spoken, rate);
  let settled = false;
  let gotBoundary = false;
  let startedAt = 0;

  const publish = (range: SpokenRange | null) => {
    if (speakToken !== mine) return;
    options?.onWord?.(range);
  };

  const finish = () => {
    if (settled || speakToken !== mine) return;
    settled = true;
    clearWordClock();
    publish(null);
    onEnd?.();
  };

  void (async () => {
    const voice = await resolveVoice(options?.voiceId, options?.speaker);
    if (speakToken !== mine) return;
    setTimeout(() => {
      if (speakToken !== mine) return;
      startedAt = Date.now();

      if (options?.onWord && words.length > 0) {
        const first = words[0];
        if (first) publish({ start: first.start, end: first.end });
        wordClock = setInterval(() => {
          if (speakToken !== mine || gotBoundary) return;
          const word = wordAtElapsed(words, Date.now() - startedAt);
          if (word) publish({ start: word.start, end: word.end });
        }, WORD_CLOCK_MS);
      }

      Speech.speak(spoken, {
        language: "en-US",
        rate,
        pitch: pitchForSpeaker(options?.speaker),
        voice: voice ?? undefined,
        onBoundary: (event) => {
          if (speakToken !== mine || typeof event.charIndex !== "number") return;
          const word = wordAtChar(words, event.charIndex);
          if (!word) return;
          gotBoundary = true;
          publish({ start: word.start, end: word.end });
        },
        onDone: finish,
        onStopped: finish,
        onError: finish,
      });
    }, 60);
  })();
}
