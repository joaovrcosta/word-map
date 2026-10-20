import { useCallback, useState } from "react";
import { View } from "react-native";
import { type Href, router, useFocusEffect } from "expo-router";
import { useSession } from "../../../src/session";
import { type Vault } from "../../../src/types";
import { Heading, Loading, Muted, PrimaryButton, Screen } from "../../../src/ui";

export default function TrainingScreen() {
  const { request } = useSession();
  const [wordCount, setWordCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const vaults = await request<Vault[]>("/vaults");
      const total = vaults.reduce((sum, vault) => sum + (vault.words?.length ?? 0), 0);
      setWordCount(total);
    } catch {
      setWordCount((current) => current ?? 0);
    }
  }, [request]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (wordCount === null) return <Loading />;

  return (
    <Screen>
      <Heading>Treino</Heading>
      {wordCount === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Muted>Nenhuma palavra ainda. Salve palavras em um vault para treinar.</Muted>
          <PrimaryButton label="Criar vault" onPress={() => router.push("/vaults" as Href)} />
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Muted>Pratique com todas as suas palavras, sem escolher um vault.</Muted>
          <PrimaryButton label="Começar" onPress={() => router.push("/flashcards/treino" as Href)} />
        </View>
      )}
    </Screen>
  );
}
