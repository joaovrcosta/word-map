import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useSession } from "../../session";
import type { StudyToday } from "../../study";
import { useTheme } from "../../theme";

const RING_ACTIVE = "#ff9600";
const SIZE = 36;
const STROKE = 1.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = {
  onPress?: () => void;
  /** Circular icon for home header (bookvo-style). */
  compact?: boolean;
};

export function StudyOffenseChip({ onPress, compact = false }: Props) {
  const theme = useTheme();
  const { request } = useSession();
  const [today, setToday] = useState<StudyToday | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const next = await request<StudyToday>("/study/today");
          if (alive) setToday(next);
        } catch {
          if (alive) setToday(null);
        }
      })();
      return () => {
        alive = false;
      };
    }, [request])
  );

  const goalSeconds = Math.max(1, (today?.goalMinutes ?? 5) * 60);
  const progress = Math.min(1, (today?.seconds ?? 0) / goalSeconds);
  const done = Boolean(today?.completed) || progress >= 1;
  const inProgress = !done && progress > 0;
  const flameColor = done || inProgress ? RING_ACTIVE : theme.shell.muted;
  const streakLabel = today?.currentStreak && today.currentStreak > 0 ? String(today.currentStreak) : null;

  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={
          today
            ? today.completed
              ? `Ofensiva de ${today.currentStreak} dias`
              : `Ofensiva: ${Math.floor(today.seconds / 60)} de ${today.goalMinutes} minutos`
            : "Ofensiva diária"
        }
        style={{
          width: SIZE,
          height: SIZE,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {inProgress ? (
          <Svg width={SIZE} height={SIZE} style={{ position: "absolute" }}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={theme.shell.line}
              strokeWidth={STROKE}
              fill="none"
              opacity={0.45}
            />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={RING_ACTIVE}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              strokeLinecap="round"
              opacity={0.9}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          </Svg>
        ) : null}
        <Ionicons name="flame" size={18} color={flameColor} />
        {streakLabel ? (
          <Text
            style={{
              position: "absolute",
              right: -1,
              bottom: 0,
              color: flameColor,
              fontFamily: theme.fonts.bold,
              fontSize: 9,
            }}
          >
            {streakLabel}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  if (!today) return null;

  const minutes = Math.floor(today.seconds / 60);
  const label = today.completed
    ? `${today.currentStreak}d`
    : `${minutes}/${today.goalMinutes} min`;
  const color = today.atRisk
    ? "#e8590c"
    : today.completed
      ? theme.colors.primary
      : theme.colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Ofensiva diária"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: theme.colors.muted,
      }}
    >
      <Ionicons name="flame" size={16} color={color} />
      <Text style={{ color, fontFamily: theme.fonts.bold, fontSize: 13 }}>{label}</Text>
      {!today.completed && today.currentStreak > 0 ? (
        <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.medium, fontSize: 11 }}>
          {today.currentStreak}d
        </Text>
      ) : null}
    </Pressable>
  );
}
