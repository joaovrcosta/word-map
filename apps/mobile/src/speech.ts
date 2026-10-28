import * as Speech from "expo-speech";

const WORD_SPEECH_RATE = 0.88;

let speakToken = 0;
let voicePromise: Promise<string | null> | null = null;
const speakerVoices = new Map<string, string | null>();

export function stopSpeech() {
  speakToken += 1;
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

export function speakPassage(
  text: string,
  onEnd?: () => void,
  options?: { speaker?: string | null; rate?: number; voiceId?: string | null }
) {
  const spoken = text.replace(/\s+/g, " ").trim();
  const mine = ++speakToken;
  Speech.stop();
  if (!spoken) {
    onEnd?.();
    return;
  }
  let settled = false;
  const finish = () => {
    if (settled || speakToken !== mine) return;
    settled = true;
    onEnd?.();
  };
  void (async () => {
    const voice = await resolveVoice(options?.voiceId, options?.speaker);
    if (speakToken !== mine) return;
    setTimeout(() => {
      if (speakToken !== mine) return;
      Speech.speak(spoken, {
        language: "en-US",
        rate: options?.rate ?? 0.92,
        pitch: pitchForSpeaker(options?.speaker),
        voice: voice ?? undefined,
        onDone: finish,
        onStopped: finish,
        onError: finish,
      });
    }, 60);
  })();
}
