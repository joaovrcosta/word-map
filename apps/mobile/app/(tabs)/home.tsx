import { useCallback, useState } from "react";
import { type Href, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { type RankingBoard } from "../../src/ranking";
import { useSession } from "../../src/session";
import { fixedTones, type ToneName, useTheme } from "../../src/theme";
import { Card, Chip, Screen } from "../../src/ui";

type Filter = "all" | "words" | "train" | "read";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Tudo" },
  { value: "words", label: "Palavras" },
  { value: "train", label: "Treino" },
  { value: "read", label: "Leitura" },
];

const SEE_ALL: Record<Filter, Href> = {
  all: "/vaults",
  words: "/vaults",
  train: "/flashcards",
  read: "/books",
};

type Shortcut = {
  key: string;
  title: string;
  meta: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: ToneName;
  href: Href;
  group: Exclude<Filter, "all">;
};

export default function HomeScreen() {
  const theme = useTheme();
  const { user, request } = useSession();
  const firstName = user?.name.split(" ")[0] || "olá";
  const initial = firstName.slice(0, 1).toUpperCase();
  const [board, setBoard] = useState<RankingBoard | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      request<RankingBoard>("/ranking?period=lifetime")
        .then((next) => {
          if (!cancelled) setBoard(next);
        })
        .catch(() => {
          if (!cancelled) setBoard(null);
        });
      return () => {
        cancelled = true;
      };
    }, [request])
  );

  const points = board?.me.points;
  const rank = board?.me.rank;
  const subtitle =
    points == null ? "Seu mapa de palavras" : rank == null ? `${points} XP` : `${points} XP · ${rank}º`;

  const shortcuts: Shortcut[] = [
    {
      key: "vaults",
      title: "Vaults",
      meta: "Palavras salvas",
      icon: "folder",
      tone: fixedTones.vaults,
      href: "/vaults",
      group: "words",
    },
    {
      key: "train",
      title: "Treino",
      meta: "Praticar agora",
      icon: "flash",
      tone: fixedTones.activity,
      href: "/flashcards",
      group: "train",
    },
    {
      key: "books",
      title: "Biblioteca",
      meta: "Seu acervo",
      icon: "book",
      tone: fixedTones.books,
      href: "/books",
      group: "read",
    },
    {
      key: "ranking",
      title: "Ranking",
      meta: points == null ? "Sua posição" : `${points} XP`,
      icon: "trophy",
      tone: fixedTones.ranking,
      href: "/ranking",
      group: "words",
    },
  ];

  const visible = shortcuts.filter((item) => {
    if (item.key === "ranking") return filter === "all";
    return filter === "all" || item.group === filter;
  });
  const rows: Shortcut[][] = [];
  for (let index = 0; index < visible.length; index += 2) rows.push(visible.slice(index, index + 2));

  return (
    <Screen scroll>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.shell.tones.lilac,
          }}
        >
          <Text style={{ color: theme.shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 20 }}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 22 }}>
            {`Olá, ${firstName}`}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
            <Ionicons name="star" size={14} color={theme.shell.mascot.accent} />
            <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 13 }}>{subtitle}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Perfil"
          onPress={() => router.push("/profile" as Href)}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.shell.chip,
          }}
        >
          <Ionicons name="person" size={20} color={theme.shell.foreground} />
        </Pressable>
      </View>

      <Card tone={fixedTones.words} onPress={() => router.push("/ranking" as Href)}>
        <Text style={{ color: theme.shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 18 }}>
          Seu próximo passo
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          <StatPill icon="star" label={points == null ? "XP" : `${points} XP`} />
          <StatPill icon="podium" label={rank == null ? "Sem posição" : `${rank}º lugar`} />
        </View>
      </Card>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22 }}>
        <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 22 }}>Continuar</Text>
        <Pressable onPress={() => router.push(SEE_ALL[filter])} hitSlop={8}>
          <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.medium, fontSize: 14 }}>Ver tudo</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        {FILTERS.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            selected={filter === item.value}
            onPress={() => setFilter(item.value)}
          />
        ))}
      </View>

      <View style={{ marginTop: 6, gap: 0 }}>
        {rows.map((row) => (
          <View key={row.map((item) => item.key).join("-")} style={{ flexDirection: "row", gap: 12 }}>
            {row.map((item) => (
              <View key={item.key} style={{ flex: 1 }}>
                <Card tone={item.tone} onPress={() => router.push(item.href)}>
                  <Ionicons name={item.icon} size={36} color={theme.shell.onPastel} />
                  <Text
                    style={{
                      marginTop: 16,
                      color: theme.shell.onPastel,
                      fontFamily: theme.fonts.bold,
                      fontSize: 16,
                    }}
                  >
                    {item.title}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
                    <Ionicons name={item.icon} size={12} color={theme.shell.onPastelMuted} />
                    <Text style={{ color: theme.shell.onPastelMuted, fontFamily: theme.fonts.medium, fontSize: 12 }}>
                      {item.meta}
                    </Text>
                  </View>
                </Card>
              </View>
            ))}
            {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}

function StatPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: theme.shell.chipActive,
      }}
    >
      <Ionicons name={icon} size={14} color={theme.shell.onPastel} />
      <Text style={{ color: theme.shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 13 }}>{label}</Text>
    </View>
  );
}
