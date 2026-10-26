import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { FlashcardDeck } from "../../../src/features/flashcards";
import { isSpeakModeLocked } from "../../../src/features/flashcards/speak-mode";

/** Mesmo critério da tela de Treino — evita entrada direta no Expo Go. */
const SPEAK_MODE_LOCKED = isSpeakModeLocked();

export default function SpeakTrainingScreen() {
  useEffect(() => {
    if (SPEAK_MODE_LOCKED) router.replace("/flashcards");
  }, []);

  if (SPEAK_MODE_LOCKED) return <View style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingTop: 8, paddingBottom: 8 }}>
        <FlashcardDeck mode="speak" autostart onLeave={() => router.back()} />
      </View>
    </View>
  );
}
