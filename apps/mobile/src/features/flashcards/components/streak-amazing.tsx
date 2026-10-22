import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { shell, useTheme } from "../../../theme";
import { useMotionEnabled } from "../motion";

const SPARKS = [
  { angle: -70, distance: 28, size: 4, delay: 40 },
  { angle: -20, distance: 32, size: 3, delay: 90 },
  { angle: 25, distance: 30, size: 4, delay: 20 },
  { angle: 70, distance: 26, size: 3, delay: 110 },
  { angle: 160, distance: 24, size: 3, delay: 60 },
];

const POINTS_YELLOW = "#ffc800";

function pointsLine(points: number) {
  if (points >= 50) return "Você está voando!";
  if (points >= 25) return "Que pontuação!";
  if (points >= 10) return "Incrível!";
  return "Bom trabalho!";
}

function Spark({
  angle,
  distance,
  size,
  delay,
  color,
}: {
  angle: number;
  distance: number;
  size: number;
  delay: number;
  color: string;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 780, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => {
    const rad = (angle * Math.PI) / 180;
    return {
      opacity: progress.value < 0.2 ? progress.value / 0.2 : 1 - (progress.value - 0.2) / 0.8,
      transform: [
        { translateX: Math.cos(rad) * distance * progress.value },
        { translateY: Math.sin(rad) * distance * progress.value },
        { scale: 0.4 + progress.value * 0.8 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function PulseRing({ delay, color }: { delay: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.2, 1], [0, 0.45, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.55, 1.55]) }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 52,
          height: 52,
          borderRadius: 26,
          borderWidth: 2,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

function PointsCount({ value }: { value: number }) {
  const motion = useMotionEnabled();
  const [shown, setShown] = useState(motion ? 0 : value);

  useEffect(() => {
    if (!motion) {
      setShown(value);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      const ratio = Math.min(1, (Date.now() - started) / 700);
      setShown(Math.round(value * ratio));
      if (ratio >= 1) clearInterval(timer);
    }, 28);
    return () => clearInterval(timer);
  }, [motion, value]);

  return <>{shown}</>;
}

/** Celebração de pontos no resumo — visual no estilo “Be amazing” (Reanimated). */
export function StreakAmazing({ points }: { points: number }) {
  const theme = useTheme();
  const motion = useMotionEnabled();
  const scale = useSharedValue(motion ? 0.35 : 1);
  const iconScale = useSharedValue(motion ? 0.6 : 1);
  const color = POINTS_YELLOW;

  useEffect(() => {
    if (!motion) return;
    scale.value = withDelay(
      120,
      withSpring(1, { damping: 11, stiffness: 160, mass: 0.7 })
    );
    iconScale.value = withDelay(
      220,
      withSequence(
        withTiming(1.18, { duration: 180 }),
        withTiming(1, { duration: 220 }),
        withTiming(1.08, { duration: 160 }),
        withTiming(1, { duration: 200 })
      )
    );
  }, [iconScale, motion, scale]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  if (points <= 0) return null;

  return (
    <Animated.View
      entering={motion ? FadeInDown.delay(80).duration(280) : undefined}
      style={{
        marginTop: 16,
        alignSelf: "stretch",
        alignItems: "center",
        backgroundColor: shell.surface,
        borderRadius: 20,
        paddingVertical: 20,
        paddingHorizontal: 16,
        overflow: "hidden",
      }}
    >
      <Animated.View style={[{ alignItems: "center" }, cardStyle]}>
        <View style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center" }}>
          {motion ? (
            <>
              <PulseRing delay={80} color={color} />
              {SPARKS.map((spark) => (
                <Spark key={`${spark.angle}-${spark.delay}`} {...spark} color={color} />
              ))}
            </>
          ) : null}
          <Animated.View style={iconStyle}>
            <Ionicons name="flash" size={34} color={color} />
          </Animated.View>
        </View>

        <View style={{ marginTop: 4, flexDirection: "row", alignItems: "baseline", gap: 6 }}>
          <Text style={{ color, fontFamily: theme.fonts.bold, fontSize: 36, lineHeight: 40 }}>
            +<PointsCount value={points} />
          </Text>
          <Text
            style={{
              color: color,
              fontFamily: theme.fonts.semibold,
              fontSize: 13,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              opacity: 0.85,
            }}
          >
            {points === 1 ? "ponto" : "pontos"}
          </Text>
        </View>
        <Text
          style={{
            marginTop: 6,
            color: shell.foreground,
            fontFamily: theme.fonts.bold,
            fontSize: 17,
            textAlign: "center",
          }}
        >
          {pointsLine(points)}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
