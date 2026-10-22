import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme";

const BURST_DOTS = [
  { left: "8%", delay: 0 },
  { left: "28%", delay: 50 },
  { left: "48%", delay: 15 },
  { left: "68%", delay: 80 },
  { left: "86%", delay: 30 },
];

export function useMotionEnabled() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (alive) setEnabled(!reduced);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (reduced) => {
      setEnabled(!reduced);
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}

export function playPop(scale: { value: number }) {
  scale.value = withSequence(withTiming(1.08, { duration: 140 }), withTiming(1, { duration: 220 }));
}

export function playShake(shift: { value: number }) {
  shift.value = withSequence(
    withTiming(-6, { duration: 72 }),
    withTiming(6, { duration: 72 }),
    withTiming(-4, { duration: 72 }),
    withTiming(3, { duration: 72 }),
    withTiming(0, { duration: 72 })
  );
}

function BurstDot({ left, delay, color }: { left: string; delay: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.25 ? progress.value / 0.25 : 1 - (progress.value - 0.25) / 0.75,
    transform: [{ translateY: 6 - progress.value * 48 }, { scale: 0.4 + progress.value * 0.6 }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 12,
          left: left as `${number}%`,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function BurstDots({ token }: { token: number }) {
  const theme = useTheme();
  if (token === 0) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 56, zIndex: 2 }}>
      {BURST_DOTS.map((dot) => (
        <BurstDot key={`${token}-${dot.left}`} left={dot.left} delay={dot.delay} color={theme.colors.green} />
      ))}
    </View>
  );
}

export function MotionFrame({
  popToken,
  shakeToken,
  burst,
  children,
  style,
}: {
  popToken: number;
  shakeToken: number;
  burst: number;
  children: ReactNode;
  style?: object;
}) {
  const motion = useMotionEnabled();
  const scale = useSharedValue(1);
  const shift = useSharedValue(0);

  useEffect(() => {
    if (!popToken || !motion) return;
    playPop(scale);
  }, [motion, popToken, scale]);

  useEffect(() => {
    if (!shakeToken || !motion) return;
    playShake(shift);
  }, [motion, shakeToken, shift]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, style, animated]}>
      {motion ? <BurstDots token={burst} /> : null}
      {children}
    </Animated.View>
  );
}

export function ShakeView({ active, children }: { active: boolean; children: ReactNode }) {
  const motion = useMotionEnabled();
  const shift = useSharedValue(0);

  useEffect(() => {
    if (!active || !motion) return;
    playShake(shift);
  }, [active, motion, shift]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value }],
  }));

  return <Animated.View style={[{ width: "100%" }, animated]}>{children}</Animated.View>;
}

export function useStudyCardSize() {
  const { width } = useWindowDimensions();
  return Math.min(Math.round((width - 40) * 0.72), 280);
}

export function FlipCard({
  flipped,
  popToken,
  front,
  back,
}: {
  flipped: boolean;
  popToken: number;
  front: ReactNode;
  back: ReactNode;
}) {
  const motion = useMotionEnabled();
  const cardSize = useStudyCardSize();
  const spin = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const target = flipped ? 180 : 0;
    spin.value = motion ? withTiming(target, { duration: 280, easing: Easing.out(Easing.cubic) }) : target;
  }, [flipped, motion, spin]);

  useEffect(() => {
    if (!popToken || !motion) return;
    playPop(scale);
  }, [motion, popToken, scale]);

  const shell = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const frontStyle = useAnimatedStyle(() => ({
    opacity: spin.value < 90 ? 1 : 0,
    transform: [{ perspective: 1200 }, { rotateY: `${spin.value}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    opacity: spin.value >= 90 ? 1 : 0,
    transform: [{ perspective: 1200 }, { rotateY: `${spin.value + 180}deg` }],
  }));
  const face = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    backfaceVisibility: "hidden" as const,
    alignItems: "center" as const,
  };

  return (
    <Animated.View style={[{ width: "100%", height: cardSize, alignItems: "center" }, shell]}>
      <Animated.View style={[face, frontStyle]} pointerEvents={flipped ? "none" : "auto"}>
        {front}
      </Animated.View>
      <Animated.View style={[face, backStyle]} pointerEvents={flipped ? "auto" : "none"}>
        {back}
      </Animated.View>
    </Animated.View>
  );
}

function fillGradient(heat: number, fallback: string): readonly [string, string, ...string[]] {
  if (heat <= 0) return [fallback, "#58cc02", "#ffc800"];
  if (heat === 1) return [fallback, "#89e219", "#ffc800"];
  if (heat === 2) return ["#ff9600", "#ffc800", "#ffe08a"];
  return ["#ff6b1a", "#ff9600", "#ffc800"];
}

function sparkColor(heat: number) {
  if (heat >= 2) return "#ffe08a";
  return "#ffc800";
}

/** Faíscas SVG no estilo Duolingo — zigue-zagues arredondados na ponta da barra. */
function ProgressSparks({ color }: { color: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      {/* superior: zigue-zague envolvendo a barra */}
      <Path
        d="M16 22 L22 12 L18 12 L28 4 L24 14 L33 8"
        stroke={color}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M26 16 L38 10"
        stroke={color}
        strokeWidth={2.8}
        strokeLinecap="round"
        fill="none"
      />
      {/* inferior */}
      <Path
        d="M16 26 L22 36 L18 36 L28 44 L24 34 L33 40"
        stroke={color}
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M26 32 L38 38"
        stroke={color}
        strokeWidth={2.8}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export function ProgressFill({
  progress,
  color,
  height = 16,
  heat = 0,
}: {
  progress: number;
  color: string;
  height?: number;
  heat?: number;
}) {
  const motion = useMotionEnabled();
  const width = useSharedValue(Math.max(0, Math.min(100, progress)));
  const spark = useSharedValue(0);
  const gradient = fillGradient(heat, color);
  const sparks = sparkColor(heat);

  useEffect(() => {
    const next = Math.max(0, Math.min(100, progress));
    if (motion) {
      width.value = withTiming(next, { duration: 320, easing: Easing.out(Easing.cubic) });
      spark.value = 0;
      spark.value = withSequence(
        withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) }),
        withDelay(260, withTiming(0, { duration: 320 }))
      );
    } else {
      width.value = next;
      spark.value = progress > 0 ? 1 : 0;
    }
  }, [motion, progress, spark, width]);

  const fill = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  const sparkStyle = useAnimatedStyle(() => ({
    left: `${width.value}%`,
    opacity: spark.value,
    transform: [
      { translateX: -24 },
      { scale: 0.88 + spark.value * 0.22 },
    ],
  }));

  return (
    <View style={{ height, borderRadius: 999, overflow: "visible", justifyContent: "center" }}>
      <View
        style={{
          height,
          borderRadius: 999,
          overflow: "hidden",
          backgroundColor: "#374151",
        }}
      >
        <Animated.View
          style={[
            {
              height: "100%",
              borderRadius: 999,
              overflow: "hidden",
              minWidth: progress > 0 ? height : 0,
            },
            fill,
          ]}
        >
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1, borderRadius: 999 }}
          />
          <LinearGradient
            colors={["rgba(255,255,255,0.45)", "rgba(255,255,255,0.12)", "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{
              position: "absolute",
              top: 2,
              left: 6,
              right: 6,
              height: Math.max(3, Math.round(height * 0.34)),
              borderRadius: 999,
            }}
          />
        </Animated.View>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: (height - 48) / 2,
            width: 48,
            height: 48,
          },
          sparkStyle,
        ]}
      >
        <ProgressSparks color={sparks} />
      </Animated.View>
    </View>
  );
}
