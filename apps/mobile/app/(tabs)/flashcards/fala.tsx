import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { FlashcardDeck } from "../../../src/features/flashcards";

/** Mesmo flag da tela de Treino — evita entrada direta na rota. */
const SPEAK_MODE_LOCKED = true;

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
