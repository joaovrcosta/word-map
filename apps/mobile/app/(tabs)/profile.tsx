import { useCallback, useState } from "react";
import { type Href, router, useFocusEffect } from "expo-router";
import { grammarClassLabel } from "@word-map/shared";
import { Text, View } from "react-native";
import { type RankingBoard } from "../../src/ranking";
import { useSession } from "../../src/session";
import { fixedTones, type ToneName, useTheme } from "../../src/theme";
import { type UserStats } from "../../src/user-stats";
import { Card, ErrorText, Heading, Loading, Muted, PrimaryButton, Screen } from "../../src/ui";

const confidenceLabels: Record<number, string> = {
  1: "Iniciante",
  2: "Básico",
  3: "Intermediário",
  4: "Avançado",
};

const barColors = ["#24c875", "#1cb0f6", "#ffc800", "#ce82ff", "#ff9600", "#ff4b4b"];

function percentLabel(count: number, total: number) {
  if (!total) return "0%";
  return `${((count / total) * 100).toFixed(1)}%`;
}

function Bar({ percent, color }: { percent: number; color: string }) {
  const theme = useTheme();
  const width = `${Math.min(Math.max(percent, 0), 100)}%` as const;
  return (
    <View
      style={{
        height: 10,
        borderRadius: 999,
        overflow: "hidden",
        backgroundColor: theme.colors.border,
      }}
    >
      <View style={{ height: "100%", width, borderRadius: 999, backgroundColor: color }} />
    </View>
  );
}

function StatTile({
  value,
  label,
  hint,
  tone,
}: {
  value: number;
  label: string;
  hint: string;
  tone: ToneName;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.shell.tones[tone],
        borderRadius: 20,
        padding: 14,
      }}
    >
      <Text style={{ color: theme.shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 24 }}>{value}</Text>
      <Text
        style={{
          marginTop: 6,
          color: theme.shell.onPastelMuted,
          fontFamily: theme.fonts.bold,
          fontSize: 11,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text style={{ marginTop: 2, color: theme.shell.onPastelMuted, fontFamily: theme.fonts.regular, fontSize: 12 }}>
        {hint}
      </Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 18 }}>{children}</Text>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut, request } = useSession();
  const firstName = user?.name.split(" ")[0] || "Você";
  const [stats, setStats] = useState<UserStats | null>(null);
  const [board, setBoard] = useState<RankingBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        request<UserStats>("/users/stats"),
        request<RankingBoard>("/ranking?period=lifetime").catch(() => null),
      ])
        .then(([statsData, ranking]) => {
          if (cancelled) return;
          setStats(statsData);
          setBoard(ranking);
          setError(null);
        })
        .catch(() => {
          if (!cancelled) setError("Não foi possível carregar suas estatísticas.");
        })
        .finally(() => {
          if (!cancelled) setLoaded(true);
        });
      return () => {
        cancelled = true;
      };
    }, [request])
  );

  if (!loaded && !stats) return <Loading />;

  const summary = stats
    ? [
        { label: "Palavras", value: stats.totalWords, hint: "Aprendidas", tone: fixedTones.words },
        { label: "Vaults", value: stats.totalVaults, hint: "Coleções", tone: fixedTones.vaults },
        { label: "Conexões", value: stats.totalConnections, hint: "Palavras ligadas", tone: fixedTones.connections },
        { label: "Atividade", value: stats.recentActivity, hint: "Últimos 30 dias", tone: fixedTones.activity },
      ]
    : [];
  const confidence = [...(stats?.wordsByConfidence ?? [])].sort((a, b) => a.confidence - b.confidence);
  const maxConfidence = Math.max(1, ...confidence.map((item) => item.count));
  const classes = [...(stats?.wordsByGrammaticalClass ?? [])].sort((a, b) => b.count - a.count);
  const rankLabel =
    board == null
      ? "Seu lugar no ranking."
      : board.me.rank == null
        ? "Sem posição no ranking."
        : `${board.me.rank}º no ranking.`;

  return (
    <Screen scroll>
      <Heading>{firstName}</Heading>
      {user?.username ? (
        <Text style={{ marginTop: 4, color: theme.colors.greenText, fontFamily: theme.fonts.bold, fontSize: 15 }}>
          @{user.username}
        </Text>
      ) : null}
      <Muted>Seu progresso no Word Map.</Muted>

      {error && !stats ? <ErrorText>{error}</ErrorText> : null}

      {stats ? (
        <>
          <View style={{ marginTop: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {summary.slice(0, 2).map((item) => (
                <StatTile key={item.label} {...item} />
              ))}
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {summary.slice(2).map((item) => (
                <StatTile key={item.label} {...item} />
              ))}
            </View>
          </View>

          <Card tone={fixedTones.xp} onPress={() => router.push("/ranking" as Href)}>
            <Text style={{ color: theme.shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 20 }}>
              {board == null ? "Ranking" : `${board.me.points} XP`}
            </Text>
            <Muted onPastel>{rankLabel}</Muted>
          </Card>

          <View style={{ marginTop: 20 }}>
            <SectionTitle>Nível de confiança</SectionTitle>
            <Muted>Distribuição das palavras por nível de aprendizado.</Muted>
            <View style={{ marginTop: 14, gap: 14 }}>
              {confidence.length === 0 ? (
                <Muted>Adicione palavras para ver esta análise.</Muted>
              ) : (
                confidence.map((item) => (
                  <View key={item.confidence}>
                    <View style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                      <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 14 }}>
                        {confidenceLabels[item.confidence] ?? `Nível ${item.confidence}`}
                      </Text>
                      <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.bold, fontSize: 12 }}>
                        {item.count} ({percentLabel(item.count, stats.totalWords)})
                      </Text>
                    </View>
                    <Bar percent={(item.count / maxConfidence) * 100} color={theme.colors.green} />
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={{ marginTop: 20 }}>
            <SectionTitle>Classe gramatical</SectionTitle>
            <Muted>Distribuição por tipo de palavra.</Muted>
            <View style={{ marginTop: 14, gap: 14 }}>
              {classes.length === 0 ? (
                <Muted>Ainda não há classes gramaticais para mostrar.</Muted>
              ) : (
                classes.map((item, index) => {
                  const share = stats.totalWords ? (item.count / stats.totalWords) * 100 : 0;
                  return (
                    <View key={item.grammaticalClass}>
                      <View style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                        <Text style={{ flex: 1, color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 14 }}>
                          {grammarClassLabel(item.grammaticalClass)}
                        </Text>
                        <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.bold, fontSize: 12 }}>
                          {item.count} ({percentLabel(item.count, stats.totalWords)})
                        </Text>
                      </View>
                      <Bar percent={share} color={barColors[index % barColors.length] ?? theme.colors.green} />
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {stats.wordsByCategory.length > 0 ? (
            <View style={{ marginTop: 20 }}>
              <SectionTitle>Categorias</SectionTitle>
              <Muted>Palavras organizadas por categoria.</Muted>
              <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {stats.wordsByCategory.map((item) => (
                  <View
                    key={item.category}
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: theme.shell.chip,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.shell.chipText,
                        fontFamily: theme.fonts.medium,
                        fontSize: 13,
                      }}
                    >
                      {item.category} ({item.count})
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      <PrimaryButton label="Sair" onPress={() => void signOut()} />
    </Screen>
  );
}
