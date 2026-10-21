import { useEffect, useState } from "react";
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
import { shell, type ToneName, useTheme } from "../../../theme";
import { useMotionEnabled } from "../motion";
import { DuoButton } from "./duo-button";
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

function SummaryMascot() {
  const motion = useMotionEnabled();
  const scale = useSharedValue(motion ? 0.7 : 1);

  useEffect(() => {
    if (!motion) return;
    scale.value = withSequence(withTiming(1.06, { duration: 220 }), withTiming(1, { duration: 180 }));
  }, [motion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ width: 140, height: 140, alignItems: "center", justifyContent: "center" }, style]}>
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
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: shell.mascot.body,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 48,
          left: 42,
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: shell.mascot.eye,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 48,
          left: 68,
          width: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: shell.mascot.eye,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 53,
          left: 47,
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: shell.mascot.pupil,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 53,
          left: 73,
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: shell.mascot.pupil,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 58,
          left: 36,
          width: 10,
          height: 6,
          borderRadius: 3,
          backgroundColor: "#FF8FAB",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 58,
          right: 36,
          width: 10,
          height: 6,
          borderRadius: 3,
          backgroundColor: "#FF8FAB",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 18,
          width: 54,
          height: 28,
          borderRadius: 8,
          backgroundColor: shell.mascot.laptop,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: 10,
          width: 64,
          height: 10,
          borderRadius: 5,
          backgroundColor: shell.mascot.laptopBase,
        }}
      />
    </Animated.View>
  );
}

function StatCard({
  tone,
  icon,
  label,
  delta,
  total,
  delay,
}: {
  tone: ToneName;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  delta: string;
  total: string;
  delay: number;
}) {
  const theme = useTheme();
  const motion = useMotionEnabled();
  const pastel = shell.tones[tone];

  return (
    <Animated.View
      entering={motion ? FadeInDown.delay(delay).duration(260) : undefined}
      style={{
        flex: 1,
        backgroundColor: pastel,
        borderRadius: 20,
        paddingTop: 14,
        paddingHorizontal: 10,
        paddingBottom: 10,
        minHeight: 168,
        justifyContent: "space-between",
      }}
    >
      <View>
        <Ionicons name={icon} size={22} color={shell.onPastel} />
        <Text
          style={{
            marginTop: 10,
            color: shell.onPastelMuted,
            fontFamily: theme.fonts.bold,
            fontSize: 12,
            lineHeight: 16,
            minHeight: 32,
          }}
        >
          {label}
        </Text>
        <Text style={{ marginTop: 6, color: shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 22 }}>{delta}</Text>
      </View>
      <View
        style={{
          marginTop: 12,
          borderWidth: 2,
          borderColor: shell.onPastel,
          backgroundColor: "rgba(26,26,26,0.08)",
          borderRadius: 14,
          paddingVertical: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 20 }}>{total}</Text>
      </View>
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
  const enter = (index: number) => (motion ? FadeInDown.delay(index * 70).duration(240) : undefined);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 24,
        }}
      >
        <SummaryConfetti show={celebrate} />
        <View style={{ alignItems: "center", marginTop: 12 }}>
          <SummaryMascot />
        </View>
        <Animated.Text
          entering={enter(1)}
          style={{
            marginTop: 8,
            color: shell.foreground,
            fontFamily: theme.fonts.bold,
            fontSize: 30,
            textAlign: "center",
            lineHeight: 36,
          }}
        >
          {headline}
        </Animated.Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 28 }}>
          <StatCard
            tone="green"
            icon="book"
            label={"Palavras\nestudadas"}
            delta={`+${session.completedWords}`}
            total={String(session.completedWords)}
            delay={120}
          />
          <StatCard
            tone="blue"
            icon="flash"
            label={"XP\nganhos"}
            delta={`+${xpGained}`}
            total={String(xpGained)}
            delay={180}
          />
          <StatCard
            tone="cream"
            icon="timer"
            label={"Tempo\npraticado"}
            delta={`+${clock}`}
            total={clock}
            delay={240}
          />
        </View>

        {challengeTotal > 0 ? (
          <Animated.Text
            entering={enter(3)}
            style={{
              marginTop: 18,
              color: shell.muted,
              fontFamily: theme.fonts.medium,
              fontSize: 14,
              textAlign: "center",
            }}
          >
            <CountUp value={challengeCorrect} /> de {challengeTotal}{" "}
            {challengeTotal === 1 ? "desafio certo" : "desafios certos"}
          </Animated.Text>
        ) : null}

        {evolved.length > 0 ? (
          <Animated.View
            entering={enter(3)}
            style={{
              marginTop: 24,
              alignSelf: "stretch",
              backgroundColor: shell.surface,
              borderRadius: 20,
              padding: 16,
            }}
          >
            <Text style={{ color: shell.foreground, fontFamily: theme.fonts.bold, fontSize: 16 }}>Evoluíram</Text>
            {evolved.map((item) => (
              <View
                key={item.id}
                style={{
                  marginTop: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, color: shell.foreground, fontFamily: theme.fonts.semibold, fontSize: 15 }}
                >
                  {item.name}
                </Text>
                <Text style={{ color: shell.tones.green, fontFamily: theme.fonts.bold, fontSize: 15 }}>
                  {item.from} → {item.to}
                </Text>
              </View>
            ))}
          </Animated.View>
        ) : null}

        {nextPractice ? (
          <Text
            style={{
              marginTop: 20,
              color: shell.foreground,
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
          <Animated.View entering={enter(4)} style={{ marginTop: 24, width: "100%", alignItems: "flex-start" }}>
            <Text style={{ color: shell.muted, fontFamily: theme.fonts.bold, fontSize: 13 }}>
              CARREGANDO O FEEDBACK DA SESSÃO
            </Text>
            <ActivityIndicator color={theme.colors.green} style={{ marginTop: 16 }} />
          </Animated.View>
        ) : null}

        {analysisState === "ready" && analysis ? (
          <Animated.View
            entering={enter(4)}
            style={{
              marginTop: 20,
              alignSelf: "stretch",
              backgroundColor: shell.surface,
              borderRadius: 20,
              padding: 16,
            }}
          >
            <Text style={{ color: shell.foreground, fontFamily: theme.fonts.regular, fontSize: 15, lineHeight: 22 }}>
              {analysis}
            </Text>
          </Animated.View>
        ) : null}

        {analysisState === "unavailable" ? (
          <Animated.Text
            entering={enter(4)}
            style={{
              marginTop: 20,
              color: shell.muted,
              fontFamily: theme.fonts.regular,
              fontSize: 15,
              lineHeight: 22,
              textAlign: "center",
            }}
          >
            O feedback não ficou pronto desta vez. Os números da sessão continuam acima.
          </Animated.Text>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16), gap: 10 }}>
        <DuoButton label="CONTINUAR" onPress={onContinue} color={shell.mascot.body} edge="#1A6FBF" />
        <Pressable onPress={onRestart} style={{ alignItems: "center", paddingVertical: 8 }}>
          <Text style={{ color: shell.muted, fontFamily: theme.fonts.semibold, fontSize: 14 }}>Estudar de novo</Text>
        </Pressable>
      </View>
    </View>
  );
}
