import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Href, router, useFocusEffect } from "expo-router";
import { isSpeakModeLocked } from "../../../src/features/flashcards/speak-mode";
import { useSession } from "../../../src/session";
import { useTheme } from "../../../src/theme";
import { type Vault } from "../../../src/types";
import { Card, Heading, Loading, Muted, PrimaryButton, Screen } from "../../../src/ui";

const SPEAK_MODE_LOCKED = isSpeakModeLocked();

export default function TrainingScreen() {
  const theme = useTheme();
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
      <Muted>Escolha o tipo de prática.</Muted>

      {wordCount === 0 ? (
        <View style={{ marginTop: 24 }}>
          <Muted>Nenhuma palavra ainda. Salve palavras em um vault para treinar.</Muted>
          <PrimaryButton label="Criar vault" onPress={() => router.push("/vaults" as Href)} />
        </View>
      ) : (
        <View style={{ marginTop: 8 }}>
          <Card tone="green" onPress={() => router.push("/flashcards/treino" as Href)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.12)",
                }}
              >
                <Ionicons name="flash" size={22} color={theme.shell.onPastel} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 18 }}>
                  Prática geral
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    color: theme.shell.onPastel,
                    fontFamily: theme.fonts.regular,
                    fontSize: 14,
                    opacity: 0.85,
                  }}
                >
                  Recordar, ouvir, combinar e completar · {wordCount}{" "}
                  {wordCount === 1 ? "item" : "itens"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.shell.onPastel} />
            </View>
          </Card>

          <Text
            style={{
              marginTop: 28,
              color: theme.colors.mutedForeground,
              fontFamily: theme.fonts.bold,
              fontSize: 13,
              letterSpacing: 0.6,
            }}
          >
            FALA
          </Text>
          <View style={{ opacity: SPEAK_MODE_LOCKED ? 0.55 : 1 }}>
            <Card tone="lilac" onPress={SPEAK_MODE_LOCKED ? undefined : () => router.push("/flashcards/fala" as Href)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.12)",
                  }}
                >
                  <Ionicons
                    name={SPEAK_MODE_LOCKED ? "lock-closed" : "mic"}
                    size={22}
                    color={theme.shell.onPastel}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 18 }}>
                    Exercícios de fala
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      color: theme.shell.onPastel,
                      fontFamily: theme.fonts.regular,
                      fontSize: 14,
                      opacity: 0.85,
                    }}
                  >
                    {SPEAK_MODE_LOCKED
                      ? "Em breve · precisa do app nativo"
                      : "Fale frases salvas e veja o alinhamento"}
                  </Text>
                </View>
                {SPEAK_MODE_LOCKED ? (
                  <Text style={{ color: theme.shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 12 }}>
                    BLOQUEADO
                  </Text>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={theme.shell.onPastel} />
                )}
              </View>
            </Card>
          </View>
        </View>
      )}
    </Screen>
  );
}
