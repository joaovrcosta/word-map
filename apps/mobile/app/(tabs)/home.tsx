import { useCallback, useState } from "react";
import { type Href, router, useFocusEffect } from "expo-router";
import { Text } from "react-native";
import { type RankingBoard } from "../../src/ranking";
import { useSession } from "../../src/session";
import { useTheme } from "../../src/theme";
import { Card, Heading, Muted, PrimaryButton, Screen } from "../../src/ui";

export default function HomeScreen() {
  const theme = useTheme();
  const { user, signOut, request } = useSession();
  const firstName = user?.name.split(" ")[0] || "olá";
  const [points, setPoints] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      request<RankingBoard>("/ranking?period=lifetime")
        .then((board) => {
          if (!cancelled) setPoints(board.me.points);
        })
        .catch(() => {
          if (!cancelled) setPoints(null);
        });
      return () => {
        cancelled = true;
      };
    }, [request])
  );

  return (
    <Screen>
      <Heading>{`Olá, ${firstName}`}</Heading>
      <Muted>Escolha por onde continuar.</Muted>
      <Card onPress={() => router.push("/ranking" as Href)}>
        <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 20 }}>
          {points == null ? "Ranking" : `${points} XP`}
        </Text>
        <Muted>Seu lugar no ranking.</Muted>
      </Card>
      <Card onPress={() => router.push("/vaults" as Href)}>
        <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 20 }}>
          Vaults
        </Text>
        <Muted>Suas palavras salvas.</Muted>
      </Card>
      <Card onPress={() => router.push("/books" as Href)}>
        <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 20 }}>
          Biblioteca
        </Text>
        <Muted>Seu acervo de leitura.</Muted>
      </Card>
      <PrimaryButton label="Sair" onPress={() => void signOut()} />
    </Screen>
  );
}
