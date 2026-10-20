import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { type Href, router, useFocusEffect } from "expo-router";
import { isWordDue } from "@word-map/shared";
import { useSession } from "../../../src/session";
import { useTheme } from "../../../src/theme";
import { type Vault, type Word } from "../../../src/types";
import { Heading, Loading, Muted, PrimaryButton, Screen } from "../../../src/ui";

type PracticeWord = Word & { lastPractice?: string | null };

type PracticeVault = Omit<Vault, "words"> & { words: PracticeWord[] };

export default function FlashcardsScreen() {
  const theme = useTheme();
  const { request } = useSession();
  const [vaults, setVaults] = useState<PracticeVault[] | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await request<PracticeVault[]>("/vaults");
      setVaults(data);
    } catch {
      setVaults((current) => current ?? []);
    }
  }, [request]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!vaults) return <Loading />;

  return (
    <Screen>
      <Heading>Flashcards</Heading>
      {vaults.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Muted>Nenhum vault ainda. Crie um vault e adicione palavras para estudar.</Muted>
          <PrimaryButton label="Criar vault" onPress={() => router.push("/vaults" as Href)} />
        </View>
      ) : (
        <ScrollView style={{ marginTop: 8 }}>
          {vaults.map((vault) => {
            const total = vault.words?.length ?? 0;
            const due = (vault.words ?? []).filter((word) => isWordDue(word)).length;
            const reviewLabel = due === 1 ? "1 para revisar" : `${due} para revisar`;
            return (
              <View
                key={vault.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 16 }}
                  >
                    {vault.name}
                  </Text>
                  <Text style={{ marginTop: 2, color: theme.colors.mutedForeground, fontFamily: theme.fonts.regular, fontSize: 14 }}>
                    {reviewLabel}
                  </Text>
                </View>
                {total === 0 ? (
                  <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.bold, fontSize: 12 }}>
                    VAZIO
                  </Text>
                ) : due === 0 ? (
                  <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.bold, fontSize: 12 }}>
                    EM DIA
                  </Text>
                ) : (
                  <Pressable
                    onPress={() => router.push(`/flashcards/${vault.id}` as Href)}
                    style={{
                      backgroundColor: theme.colors.green,
                      borderRadius: 16,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    }}
                  >
                    <Text style={{ color: "#ffffff", fontFamily: theme.fonts.bold, fontSize: 13 }}>ESTUDAR</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}
