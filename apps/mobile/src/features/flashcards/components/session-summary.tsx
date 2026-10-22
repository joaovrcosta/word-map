import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { shell, useTheme } from "../../../theme";
import { useMotionEnabled } from "../motion";
import { DuoButton } from "./duo-button";
import { StreakAmazing } from "./streak-amazing";
import { type LevelShift, type StudySession } from "../types";

const CONFETTI_COLORS = [
  shell.tones.green,
  shell.tones.cream,
  shell.tones.blue,
  shell.tones.lilac,
  shell.mascot.accent,
];

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function ConfettiBit({ index }: { index: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(index * 30, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [index, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: (index % 2 === 0 ? -1 : 1) * (20 + (index % 5) * 18) * progress.value },
      { translateY: -30 - progress.value * (80 + (index % 4) * 24) },
      { rotate: `${progress.value * (index % 2 === 0 ? 180 : -160)}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: `${8 + ((index * 5) % 84)}%`,
          top: 70,
          width: 8,
          height: 12,
          borderRadius: 2,
          backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        },
        style,
      ]}
    />
  );
}

function SummaryConfetti({ show }: { show: boolean }) {
  const motion = useMotionEnabled();
  if (!show || !motion) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 220 }}>
      {Array.from({ length: 14 }, (_, index) => (
        <ConfettiBit key={index} index={index} />
      ))}
    </View>
  );
}

function SummaryMascot() {
  const motion = useMotionEnabled();
  const scale = useSharedValue(motion ? 0.7 : 1);

  useEffect(() => {
    if (!motion) return;
    scale.value = withSequence(withTiming(1.06, { duration: 220 }), withTiming(1, { duration: 180 }));
  }, [motion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value * 0.78 }] }));

  return (
    <Animated.View style={[{ width: 108, height: 108, alignItems: "center", justifyContent: "center" }, style]}>
      <View
        style={{
          position: "absolute",
          top: 8,
          width: 88,
          height: 18,
          borderRadius: 9,
          backgroundColor: shell.tones.green,
          transform: [{ rotate: "-18deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 28,
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: shell.tones.green,
        }}
      />
      <View
        style={{
          width: 92,
          height: 78,
          borderRadius: 40,
          backgroundColor: shell.mascot.body,
          marginTop: 18,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 28,
          right: 22,
          width: 36,
          height: 28,
          borderRadius: 8,
          backgroundColor: shell.mascot.laptop,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 40,
          left: 34,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: shell.mascot.eye,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 40,
          left: 52,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: shell.mascot.eye,
        }}
      />
    </Animated.View>
  );
}

function Metric({
  icon,
  label,
  value,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  delay: number;
}) {
  const theme = useTheme();
  const motion = useMotionEnabled();

  return (
    <Animated.View
      entering={motion ? FadeInDown.delay(delay).duration(240) : undefined}
      style={{ flex: 1, alignItems: "center", gap: 6 }}
    >
      <Ionicons name={icon} size={18} color={shell.muted} />
      <Text style={{ color: shell.foreground, fontFamily: theme.fonts.bold, fontSize: 22 }}>{value}</Text>
      <Text
        style={{
          color: shell.muted,
          fontFamily: theme.fonts.medium,
          fontSize: 12,
          textAlign: "center",
          lineHeight: 16,
        }}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

export function SessionSummary({
  session,
  challengeCorrect,
  challengeTotal,
  sessionXp,
  analysis,
  analysisState,
  nextPractice,
  evolved,
  onRestart,
  onContinue,
}: {
  session: StudySession;
  challengeCorrect: number;
  challengeTotal: number;
  sessionXp: number;
  analysis: string | null;
  analysisState: "none" | "loading" | "ready" | "unavailable";
  nextPractice: string | null;
  evolved: LevelShift[];
  onRestart: () => void;
  onContinue: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const motion = useMotionEnabled();
  const elapsedSec = session.endTime
    ? Math.max(0, Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000))
    : 0;
  const clock = formatClock(elapsedSec);
  const celebrate = challengeTotal > 0 && challengeCorrect / challengeTotal >= 0.7;
  const xpGained = sessionXp;
  const headline = celebrate ? "É assim que se faz!" : challengeTotal > 0 ? "Boa sessão!" : "Sessão concluída";
  const enter = (index: number) => (motion ? FadeInDown.delay(index * 80).duration(260) : undefined);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: 28,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SummaryConfetti show={celebrate} />

        <View style={{ alignItems: "center", marginTop: 12 }}>
          <SummaryMascot />
        </View>

        <Animated.Text
          entering={enter(1)}
          style={{
            marginTop: 16,
            color: shell.foreground,
            fontFamily: theme.fonts.bold,
            fontSize: 26,
            textAlign: "center",
            lineHeight: 32,
          }}
        >
          {headline}
        </Animated.Text>

        <StreakAmazing points={xpGained} />

        <Animated.View
          entering={enter(2)}
          style={{
            marginTop: 28,
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Metric icon="book-outline" label="Palavras" value={`+${session.completedWords}`} delay={140} />
          <Metric
            icon="checkmark-circle-outline"
            label="Acertos"
            value={challengeTotal > 0 ? `${challengeCorrect}/${challengeTotal}` : "—"}
            delay={200}
          />
          <Metric icon="time-outline" label="Tempo" value={clock} delay={260} />
        </Animated.View>

        {evolved.length > 0 ? (
          <Animated.View entering={enter(3)} style={{ marginTop: 32 }}>
            <Text
              style={{
                color: shell.muted,
                fontFamily: theme.fonts.semibold,
                fontSize: 12,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Evoluíram
            </Text>
            {evolved.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: shell.line,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, color: shell.foreground, fontFamily: theme.fonts.medium, fontSize: 15 }}
                >
                  {item.name}
                </Text>
                <Text style={{ color: shell.muted, fontFamily: theme.fonts.semibold, fontSize: 14 }}>
                  {item.from} → {item.to}
                </Text>
              </View>
            ))}
          </Animated.View>
        ) : null}

        {nextPractice ? (
          <Animated.Text
            entering={enter(3)}
            style={{
              marginTop: 28,
              color: shell.muted,
              fontFamily: theme.fonts.regular,
              fontSize: 14,
              lineHeight: 21,
              textAlign: "center",
            }}
          >
            {nextPractice}
          </Animated.Text>
        ) : null}

        {analysisState === "loading" ? (
          <View style={{ marginTop: 28, alignItems: "center" }}>
            <ActivityIndicator color={theme.colors.green} />
          </View>
        ) : null}

        {analysisState === "ready" && analysis ? (
          <Animated.Text
            entering={enter(4)}
            style={{
              marginTop: 28,
              color: shell.muted,
              fontFamily: theme.fonts.regular,
              fontSize: 14,
              lineHeight: 22,
              textAlign: "center",
            }}
          >
            {analysis}
          </Animated.Text>
        ) : null}

        {analysisState === "unavailable" ? (
          <Animated.Text
            entering={enter(4)}
            style={{
              marginTop: 28,
              color: shell.muted,
              fontFamily: theme.fonts.regular,
              fontSize: 14,
              lineHeight: 22,
              textAlign: "center",
            }}
          >
            O feedback não ficou pronto desta vez.
          </Animated.Text>
        ) : null}

        <View style={{ flex: 1, minHeight: 24 }} />
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 18), gap: 12 }}>
        <DuoButton label="CONTINUAR" onPress={onContinue} color={shell.mascot.body} edge="#1A6FBF" />
        <Pressable onPress={onRestart} style={{ alignItems: "center", paddingVertical: 6 }}>
          <Text style={{ color: shell.muted, fontFamily: theme.fonts.semibold, fontSize: 14 }}>Estudar de novo</Text>
        </Pressable>
      </View>
    </View>
  );
}
