import * as Speech from "expo-speech";

let speakToken = 0;

export function stopSpeech() {
  speakToken += 1;
  Speech.stop();
}

export function speakWord(word: string) {
  speakToken += 1;
  Speech.stop();
  Speech.speak(word, { language: "en-US", rate: 0.8 });
}

export function speakPassage(text: string, onEnd?: () => void) {
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
  setTimeout(() => {
    if (speakToken !== mine) return;
    Speech.speak(spoken, {
      language: "en-US",
      rate: 0.9,
      onDone: finish,
      onStopped: finish,
      onError: finish,
    });
  }, 80);
}
