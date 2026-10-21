import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Screen } from "../../src/ui";
import { useSession } from "../../src/session";
import { useTheme } from "../../src/theme";
import { type RankingBoard, type RankingPeriod } from "../../src/ranking";

const periods: Array<{ id: RankingPeriod; label: string }> = [
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
  { id: "lifetime", label: "Total" },
];

const avatarTones = ["#ce82ff", "#1cb0f6", "#ff9600", "#58cc02", "#ff4b4b", "#2b70c9", "#ff86d0"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "A";
}

function Medal({ color }: { color: string }) {
  return (
    <View style={{ width: 32, alignItems: "center" }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: color }} />
    </View>
  );
}

function RankMark({ rank }: { rank: number }) {
  const theme = useTheme();
  if (rank === 1) return <Medal color="#ffc800" />;
  if (rank === 2) return <Medal color="#d5dde6" />;
  if (rank === 3) return <Medal color="#e7a15a" />;
  return (
    <Text
      style={{
        width: 32,
        textAlign: "center",
        color: "#afafaf",
        fontFamily: theme.fonts.bold,
        fontSize: 15,
      }}
    >
      {rank}
    </Text>
  );
}

function Row({
  rank,
  name,
  points,
  isMe,
  avatar,
}: {
  rank: number;
  name: string;
  points: number;
  isMe: boolean;
  avatar: string;
}) {
  const theme = useTheme();
  const highlight = "#3a2d4d";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: isMe ? highlight : "transparent",
      }}
    >
      <RankMark rank={rank} />
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: avatar,
        }}
      >
        <Text style={{ color: "#ffffff", fontFamily: theme.fonts.bold, fontSize: 15 }}>
          {isMe && name === "Você" ? "★" : initials(name)}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        style={{ flex: 1, color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 16 }}
      >
        {name}
        {isMe && name !== "Você" ? <Text style={{ color: "#ffc800" }}> ★</Text> : null}
      </Text>
      <Text style={{ color: "#afafaf", fontFamily: theme.fonts.bold, fontSize: 16 }}>{points} XP</Text>
    </View>
  );
}

export default function RankingScreen() {
  const theme = useTheme();
  const { request } = useSession();
  const [period, setPeriod] = useState<RankingPeriod>("week");
  const [board, setBoard] = useState<RankingBoard | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    request<RankingBoard>(`/ranking?period=${period}`)
      .then((data) => {
        if (cancelled) return;
        setBoard(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [period, request]);

  const listed = board?.entries ?? [];
  const meInList = listed.some((entry) => entry.isMe);
  const pointsPerWord = board?.pointsPerWord ?? 10;
  const pointsPerChallenge = board?.pointsPerChallenge ?? 10;

  return (
    <Screen scroll>
      <Text
        style={{
          marginTop: 12,
          textAlign: "center",
          color: theme.colors.foreground,
          fontFamily: theme.fonts.bold,
          fontSize: 28,
        }}
      >
        Ranking
      </Text>
      <Text
        style={{
          marginTop: 6,
          textAlign: "center",
          color: "#afafaf",
          fontFamily: theme.fonts.regular,
          fontSize: 15,
          lineHeight: 22,
        }}
      >
        {`Cada palavra salva vale ${pointsPerWord} XP. Cada acerto no flashcard vale ${pointsPerChallenge} XP.`}
      </Text>
      <View style={{ marginTop: 16, flexDirection: "row", justifyContent: "center", gap: 24 }}>
        {periods.map((item) => {
          const selected = period === item.id;
          return (
            <Pressable key={item.id} onPress={() => setPeriod(item.id)}>
              <Text
                style={{
                  color: selected ? "#ffc800" : "#afafaf",
                  fontFamily: theme.fonts.bold,
                  fontSize: 15,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {status === "loading" ? (
        <Text style={{ marginTop: 40, textAlign: "center", color: "#afafaf", fontFamily: theme.fonts.regular }}>
          Carregando ranking...
        </Text>
      ) : status === "error" || !board ? (
        <Text style={{ marginTop: 40, textAlign: "center", color: "#afafaf", fontFamily: theme.fonts.regular }}>
          Não foi possível carregar o ranking.
        </Text>
      ) : listed.length === 0 ? (
        <Text style={{ marginTop: 40, textAlign: "center", color: "#afafaf", fontFamily: theme.fonts.regular }}>
          Ninguém pontuou ainda neste período.
        </Text>
      ) : (
        <View style={{ marginTop: 24 }}>
          {listed.map((entry) => (
            <Row
              key={entry.userId}
              rank={entry.rank}
              name={entry.name}
              points={entry.points}
              isMe={entry.isMe}
              avatar={avatarTones[entry.userId % avatarTones.length] ?? "#ce82ff"}
            />
          ))}
          {!meInList ? (
            <View style={{ marginTop: 8 }}>
              <Row
                rank={board.me.rank ?? listed.length + 1}
                name="Você"
                points={board.me.points}
                isMe
                avatar="#ce82ff"
              />
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
