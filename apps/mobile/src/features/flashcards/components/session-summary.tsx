import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
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
import { type LevelShift, type StudySession } from "../types";

const SPARK_COLORS = [shell.tones.cream, shell.tones.green, shell.tones.blue, shell.mascot.accent];

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function Spark({ index }: { index: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(index * 40, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [index, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: (index % 2 === 0 ? -1 : 1) * (16 + (index % 4) * 14) * progress.value },
      { translateY: -20 - progress.value * (70 + (index % 3) * 20) },
      { rotate: `${progress.value * (index % 2 === 0 ? 120 : -140)}deg` },
      { scale: 1 - progress.value * 0.35 },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: `${12 + ((index * 7) % 76)}%`,
          top: 40,
          width: 10,
          height: 10,
          borderRadius: 3,
          backgroundColor: SPARK_COLORS[index % SPARK_COLORS.length],
        },
        style,
      ]}
    />
  );
}

function SummaryMascot() {
  const motion = useMotionEnabled();
  const scale = useSharedValue(motion ? 0.82 : 1);

  useEffect(() => {
    if (!motion) return;
    scale.value = withSequence(
      withTiming(1.04, { duration: 220, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 180 })
    );
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

function StatCard({
  label,
  value,
  tone,
  delay,
}: {
  label: string;
  value: string;
  tone: string;
  delay: number;
}) {
  const theme = useTheme();
  const motion = useMotionEnabled();
  return (
    <Animated.View
      entering={motion ? FadeInDown.delay(delay).duration(280) : undefined}
      style={{
        flex: 1,
        borderRadius: 18,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: shell.line,
        backgroundColor: shell.surface,
      }}
    >
      <View style={{ backgroundColor: tone, paddingVertical: 8, alignItems: "center" }}>
        <Text
          style={{
            color: shell.onPastel,
            fontFamily: theme.fonts.bold,
            fontSize: 11,
            letterSpacing: 0.7,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
      </View>
      <View style={{ paddingVertical: 16, alignItems: "center" }}>
        <Text style={{ color: shell.foreground, fontFamily: theme.fonts.bold, fontSize: 24 }}>{value}</Text>
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
        {celebrate ? (
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 180 }}>
            {Array.from({ length: 10 }, (_, index) => (
              <Spark key={index} index={index} />
            ))}
          </View>
        ) : null}

        <View style={{ alignItems: "center", marginTop: 20 }}>
          <SummaryMascot />
        </View>

        <Animated.Text
          entering={enter(1)}
          style={{
            marginTop: 18,
            color: shell.mascot.accent,
            fontFamily: theme.fonts.display,
            fontSize: 42,
            textAlign: "center",
            lineHeight: 48,
          }}
        >
          {headline}
        </Animated.Text>

        <Animated.Text
          entering={enter(2)}
          style={{
            marginTop: 6,
            color: shell.muted,
            fontFamily: theme.fonts.medium,
            fontSize: 15,
            textAlign: "center",
          }}
        >
          Sessão de prática
        </Animated.Text>

        <View style={{ marginTop: 28, flexDirection: "row", gap: 10 }}>
          <StatCard label="Total XP" value={`+${sessionXp}`} tone={shell.tones.cream} delay={180} />
          <StatCard
            label={celebrate ? "Ótimo!" : "Acertos"}
            value={challengeTotal > 0 ? `${challengeCorrect}/${challengeTotal}` : "—"}
            tone={shell.tones.green}
            delay={240}
          />
          <StatCard label="Tempo" value={clock} tone={shell.tones.blue} delay={300} />
        </View>

        {session.completedWords > 0 ? (
          <Animated.Text
            entering={enter(3)}
            style={{
              marginTop: 16,
              color: shell.muted,
              fontFamily: theme.fonts.medium,
              fontSize: 14,
              textAlign: "center",
            }}
          >
            +{session.completedWords} {session.completedWords === 1 ? "palavra" : "palavras"}
          </Animated.Text>
        ) : null}

        {evolved.length > 0 ? (
          <Animated.View entering={enter(4)} style={{ marginTop: 28 }}>
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
            entering={enter(4)}
            style={{
              marginTop: 24,
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
          <View style={{ marginTop: 24, alignItems: "center" }}>
            <ActivityIndicator color={theme.colors.green} />
          </View>
        ) : null}

        {analysisState === "ready" && analysis ? (
          <Animated.Text
            entering={enter(5)}
            style={{
              marginTop: 24,
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
            entering={enter(5)}
            style={{
              marginTop: 24,
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

      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 18), gap: 10 }}>
        <Pressable
          onPress={onContinue}
          style={{
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            backgroundColor: shell.tones.green,
          }}
        >
          <Text
            style={{
              color: shell.onPastel,
              fontFamily: theme.fonts.bold,
              fontSize: 17,
              letterSpacing: 0.6,
            }}
          >
            CONTINUAR
          </Text>
        </Pressable>
        <Pressable onPress={onRestart} style={{ alignItems: "center", paddingVertical: 6 }}>
          <Text style={{ color: shell.muted, fontFamily: theme.fonts.semibold, fontSize: 14 }}>Estudar de novo</Text>
        </Pressable>
      </View>
    </View>
  );
}
