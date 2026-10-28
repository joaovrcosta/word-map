import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { shell, useTheme } from "../../theme";
import { useMotionEnabled } from "../flashcards/motion";
import type { StoryCompletion } from "./types";

const SPARK_COLORS = [shell.tones.cream, shell.tones.green, shell.tones.blue, shell.mascot.accent];

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
          top: 48,
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

function StoryMark() {
  const theme = useTheme();
  const motion = useMotionEnabled();
  const scale = useSharedValue(motion ? 0.82 : 1);

  useEffect(() => {
    if (!motion) return;
    scale.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.back(1.4)) });
  }, [motion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ alignItems: "center", justifyContent: "center" }, style]}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 27,
            backgroundColor: shell.tones.cream,
            borderWidth: 2,
            borderColor: shell.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 20 }}>L</Text>
        </View>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: shell.tones.blue,
            borderWidth: 2,
            borderColor: shell.line,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 4,
          }}
        >
          <Ionicons name="book" size={26} color={shell.onPastel} />
        </View>
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 27,
            backgroundColor: shell.tones.green,
            borderWidth: 2,
            borderColor: shell.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 20 }}>M</Text>
        </View>
      </View>
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
            fontSize: 12,
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
      </View>
      <View style={{ paddingVertical: 18, alignItems: "center" }}>
        <Text style={{ color: shell.foreground, fontFamily: theme.fonts.bold, fontSize: 28 }}>{value}</Text>
      </View>
    </Animated.View>
  );
}

export function StoryComplete({
  title,
  summary,
  onContinue,
}: {
  title: string;
  summary: StoryCompletion;
  onContinue: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const motion = useMotionEnabled();
  const accuracy =
    summary.challengeCount > 0
      ? Math.round((summary.correctCount / summary.challengeCount) * 100)
      : 100;
  const celebrate = accuracy >= 70;
  const enter = (index: number) => (motion ? FadeInDown.delay(index * 90).duration(260) : undefined);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 28 }}>
        {celebrate ? (
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 180 }}>
            {Array.from({ length: 10 }, (_, index) => (
              <Spark key={index} index={index} />
            ))}
          </View>
        ) : null}

        <View style={{ alignItems: "center", marginTop: 36 }}>
          <StoryMark />
        </View>

        <Animated.Text
          entering={enter(1)}
          style={{
            marginTop: 28,
            color: shell.mascot.accent,
            fontFamily: theme.fonts.display,
            fontSize: 42,
            textAlign: "center",
            lineHeight: 48,
          }}
        >
          Fim da história
        </Animated.Text>

        <Animated.Text
          entering={enter(2)}
          style={{
            marginTop: 6,
            color: shell.foreground,
            fontFamily: theme.fonts.bold,
            fontSize: 22,
            textAlign: "center",
          }}
        >
          {title}
        </Animated.Text>

        <Animated.Text
          entering={enter(3)}
          style={{
            marginTop: 10,
            color: shell.muted,
            fontFamily: theme.fonts.medium,
            fontSize: 15,
            textAlign: "center",
            lineHeight: 22,
          }}
        >
          {summary.challengeCount === 0
            ? "Você leu até o fim."
            : summary.awarded
              ? "Ótima leitura — XP da primeira conclusão."
              : "Você já tinha concluído esta história."}
        </Animated.Text>

        <View style={{ marginTop: 32, flexDirection: "row", gap: 12 }}>
          <StatCard
            label="Total XP"
            value={summary.awarded ? `+${summary.points}` : "+0"}
            tone={shell.tones.cream}
            delay={220}
          />
          <StatCard
            label={accuracy >= 80 ? "Ótimo!" : accuracy >= 50 ? "Bom!" : "Continue"}
            value={
              summary.challengeCount > 0
                ? `${summary.correctCount}/${summary.challengeCount}`
                : "—"
            }
            tone={shell.tones.green}
            delay={300}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 18), paddingTop: 12 }}>
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
      </View>
    </View>
  );
}
