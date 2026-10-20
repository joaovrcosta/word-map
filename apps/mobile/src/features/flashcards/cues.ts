import { useEffect } from "react";
import { Platform } from "react-native";
import { useAudioPlayer } from "expo-audio";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

const SOUND_KEY = "wordmap-flashcard-sound";
const soundOn = { current: true };

type CuePlayer = { seekTo: (seconds: number) => Promise<void> | void; play: () => void };

function buzz(kind: "success" | "error" | "tap" | "rate") {
  if (Platform.OS === "web") return;
  if (kind === "success") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === "error") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  else if (kind === "tap") void Haptics.selectionAsync();
  else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function replay(player: CuePlayer) {
  if (!soundOn.current) return;
  void Promise.resolve(player.seekTo(0))
    .then(() => player.play())
    .catch(() => undefined);
}

export const cues = {
  correct: () => undefined as void,
  wrong: () => undefined as void,
  tap: () => undefined as void,
  rate: () => undefined as void,
  done: () => undefined as void,
};

export function useLessonCues() {
  const correctPlayer = useAudioPlayer(require("../../../assets/sfx/correct.wav"));
  const errorPlayer = useAudioPlayer(require("../../../assets/sfx/error.wav"));
  const donePlayer = useAudioPlayer(require("../../../assets/sfx/done.wav"));

  useEffect(() => {
    cues.correct = () => {
      buzz("success");
      replay(correctPlayer);
    };
    cues.wrong = () => {
      buzz("error");
      replay(errorPlayer);
    };
    cues.tap = () => buzz("tap");
    cues.rate = () => buzz("rate");
    cues.done = () => replay(donePlayer);
  }, [correctPlayer, donePlayer, errorPlayer]);
}

export function isSoundOn() {
  return soundOn.current;
}

export function syncSoundEnabled(enabled: boolean) {
  soundOn.current = enabled;
}

export async function readSoundEnabled() {
  try {
    const storage = Platform.OS === "web" && typeof localStorage !== "undefined" ? localStorage : null;
    const raw = storage ? storage.getItem(SOUND_KEY) : await SecureStore.getItemAsync(SOUND_KEY);
    return raw !== "off";
  } catch {
    return true;
  }
}

export async function writeSoundEnabled(enabled: boolean) {
  const storage = Platform.OS === "web" && typeof localStorage !== "undefined" ? localStorage : null;
  const raw = enabled ? "on" : "off";
  if (storage) storage.setItem(SOUND_KEY, raw);
  else await SecureStore.setItemAsync(SOUND_KEY, raw);
}
