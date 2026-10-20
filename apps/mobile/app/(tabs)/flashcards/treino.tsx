import { KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { FlashcardDeck } from "../../../src/features/flashcards";
import { Screen } from "../../../src/ui";

export default function TrainingSessionScreen() {
  return (
    <Screen padded={false} safeBottom>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlashcardDeck autostart onLeave={() => router.back()} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
