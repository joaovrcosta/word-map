import { KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { FlashcardDeck } from "../../../src/features/flashcards";
import { Screen } from "../../../src/ui";

export default function FlashcardSessionScreen() {
  const { vaultId } = useLocalSearchParams<{ vaultId: string }>();
  const id = Number(vaultId);

  return (
    <Screen padded={false} safeBottom>
      {Number.isInteger(id) && id > 0 ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <FlashcardDeck vaultId={id} onLeave={() => router.back()} />
        </KeyboardAvoidingView>
      ) : null}
    </Screen>
  );
}
