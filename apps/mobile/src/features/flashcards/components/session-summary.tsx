import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import { useTheme } from "../../../theme";
import { useMotionEnabled } from "../motion";
import { DuoButton } from "./duo-button";
import { CHALLENGE_XP } from "./lesson-bar";
import { type LevelShift, type StudySession } from "../types";

const CONFETTI_COLORS = ["#24c875", "#ff9600", "#1cb0f6", "#ff4b4b", "#ffc800"];

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
          left: `${8 + (index * 5) % 84}%`,
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
      {Array.from({ length: 18 }, (_, index) => (
        <ConfettiBit key={index} index={index} />
      ))}
    </View>
  );
}

function CountUp({ value }: { value: number }) {
  const motion = useMotionEnabled();
  const [shown, setShown] = useState(motion ? 0 : value);

  useEffect(() => {
    if (!motion) {
      setShown(value);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      const ratio = Math.min(1, (Date.now() - started) / 800);
      setShown(Math.round(value * ratio));
      if (ratio >= 1) clearInterval(timer);
    }, 32);
    return () => clearInterval(timer);
  }, [motion, value]);

  return <>{shown}</>;
}

function SummaryIcon() {
  const motion = useMotionEnabled();
  const scale = useSharedValue(motion ? 0.6 : 1);

  useEffect(() => {
    if (!motion) return;
    scale.value = withSequence(withTiming(1.08, { duration: 180 }), withTiming(1, { duration: 160 }));
  }, [motion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={style}>
      <Ionicons name="trophy" size={56} color="#ffc800" />
    </Animated.View>
  );
}
export function SessionSummary({
  session,
  challengeCorrect,
  challengeTotal,
  analysis,
  analysisState,
  nextPractice,
  evolved,
  onRestart,
}: {
  session: StudySession;
  challengeCorrect: number;
  challengeTotal: number;
  analysis: string | null;
  analysisState: "none" | "loading" | "ready" | "unavailable";
  nextPractice: string | null;
  evolved: LevelShift[];
  onRestart: () => void;
}) {
  const theme = useTheme();
  const motion = useMotionEnabled();
  const duration = session.endTime
    ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000 / 60)
    : 0;
  const durationLabel = duration < 1 ? "Menos de um minuto" : `${duration} min`;
  const celebrate = challengeTotal > 0 && challengeCorrect / challengeTotal >= 0.7;
  const xpGained = challengeCorrect * CHALLENGE_XP;
  const enter = (index: number) => (motion ? FadeInDown.delay(index * 70).duration(240) : undefined);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingVertical: 24 }}
    >
      <SummaryConfetti show={celebrate} />
      <Animated.View entering={enter(0)}>
        <SummaryIcon />
      </Animated.View>
      <Animated.Text
        entering={enter(1)}
        style={{ marginTop: 12, color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 26, textAlign: "center" }}
      >
        Sessão concluída
      </Animated.Text>
      <Animated.Text
        entering={enter(2)}
        style={{ marginTop: 8, color: "#ffc800", fontFamily: theme.fonts.bold, fontSize: 32, textAlign: "center" }}
      >
        +<CountUp value={xpGained} /> XP
      </Animated.Text>
      <Animated.Text
        entering={enter(2)}
        style={{ marginTop: 12, color: theme.colors.mutedForeground, fontFamily: theme.fonts.regular, fontSize: 15, textAlign: "center" }}
      >
        <CountUp value={session.completedWords} /> {session.completedWords === 1 ? "palavra estudada" : "palavras estudadas"}
      </Animated.Text>
      <Animated.Text entering={enter(2)} style={{ marginTop: 4, color: theme.colors.mutedForeground, fontFamily: theme.fonts.regular, fontSize: 15 }}>
        {durationLabel}
      </Animated.Text>
      {challengeTotal > 0 ? (
        <Animated.Text
          entering={enter(2)}
          style={{ marginTop: 4, color: theme.colors.mutedForeground, fontFamily: theme.fonts.regular, fontSize: 15, textAlign: "center" }}
        >
          <CountUp value={challengeCorrect} /> de {challengeTotal} {challengeTotal === 1 ? "desafio certo" : "desafios certos"}
        </Animated.Text>
      ) : null}
      {evolved.length > 0 ? (
        <Animated.View entering={enter(3)} style={{ marginTop: 24, alignSelf: "stretch" }}>
          <Text
            style={{
              color: theme.colors.foreground,
              fontFamily: theme.fonts.bold,
              fontSize: 15,
              textAlign: "center",
            }}
          >
            Evoluíram
          </Text>
          {evolved.map((item) => (
            <View
              key={item.id}
              style={{
                marginTop: 10,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Text
                numberOfLines={1}
                style={{ flex: 1, color: theme.colors.foreground, fontFamily: theme.fonts.semibold, fontSize: 16 }}
              >
                {item.name}
              </Text>
              <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.bold, fontSize: 15 }}>
                {item.from} → {item.to}
              </Text>
            </View>
          ))}
        </Animated.View>
      ) : null}
      {nextPractice ? (
        <Text
          style={{
            marginTop: 24,
            color: theme.colors.foreground,
            fontFamily: theme.fonts.bold,
            fontSize: 15,
            lineHeight: 22,
            textAlign: "center",
          }}
        >
          {nextPractice}
        </Text>
      ) : null}
      {analysisState === "loading" ? (
        <Animated.View entering={enter(3)} style={{ marginTop: 24, width: "100%", alignItems: "flex-start" }}>
          <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.bold, fontSize: 13 }}>
            CARREGANDO O FEEDBACK DA SESSÃO
          </Text>
          <ActivityIndicator color={theme.colors.green} style={{ marginTop: 16 }} />
        </Animated.View>
      ) : null}
      {analysisState === "ready" && analysis ? (
        <Animated.Text
          entering={enter(3)}
          style={{
            marginTop: 24,
            color: theme.colors.foreground,
            fontFamily: theme.fonts.regular,
            fontSize: 15,
            lineHeight: 22,
            textAlign: "left",
            alignSelf: "stretch",
          }}
        >
          {analysis}
        </Animated.Text>
      ) : null}
      {analysisState === "unavailable" ? (
        <Animated.Text
          entering={enter(3)}
          style={{
            marginTop: 24,
            color: theme.colors.mutedForeground,
            fontFamily: theme.fonts.regular,
            fontSize: 15,
            lineHeight: 22,
            textAlign: "center",
          }}
        >
          O feedback não ficou pronto desta vez. Os números da sessão continuam acima.
        </Animated.Text>
      ) : null}
      <Animated.View entering={enter(4)} style={{ marginTop: 28, width: "100%" }}>
        <DuoButton label="ESTUDAR DE NOVO" onPress={onRestart} color={theme.colors.green} />
      </Animated.View>
    </ScrollView>
  );
}

