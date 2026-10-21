import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, View, useWindowDimensions } from "react-native";
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

function fireColors(heat: number, fallback: string) {
  if (heat <= 0) return { base: fallback, mid: fallback, tip: "rgba(255,255,255,0.35)", spark: fallback };
  if (heat === 1) return { base: fallback, mid: "#ffc800", tip: "#ffe08a", spark: "#ffc800" };
  if (heat === 2) return { base: "#ff9600", mid: "#ffc800", tip: "#ff4b4b", spark: "#ff6b1a" };
  return { base: "#ff6b1a", mid: "#ff4b4b", tip: "#ffc800", spark: "#ff9600" };
}

function FireSpark({ delay, color, heat }: { delay: number; color: string; heat: number }) {
  const progress = useSharedValue(0);
  const motion = useMotionEnabled();

  useEffect(() => {
    if (!motion || heat < 1) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 0 })
      )
    );
    const timer = setInterval(() => {
      progress.value = 0;
      progress.value = withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 0 })
        )
      );
    }, 700);
    return () => clearInterval(timer);
  }, [delay, heat, motion, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.2 ? progress.value / 0.2 : 1 - (progress.value - 0.2) / 0.8,
    transform: [
      { translateY: -2 - progress.value * (10 + heat * 4) },
      { translateX: (delay % 3 === 0 ? -1 : 1) * progress.value * 4 },
      { scale: 0.5 + progress.value * 0.8 },
    ],
  }));

  if (heat < 1) return null;
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          right: 4 + (delay % 5) * 3,
          bottom: 2,
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: color,
        },
        style,
      ]}
    />
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
  const width = useSharedValue(progress);
  const pulse = useSharedValue(1);
  const colors = fireColors(heat, color);

  useEffect(() => {
    width.value = motion ? withTiming(progress, { duration: 280, easing: Easing.out(Easing.cubic) }) : progress;
  }, [motion, progress, width]);

  useEffect(() => {
    if (!motion || heat < 2) {
      pulse.value = 1;
      return;
    }
    pulse.value = withSequence(
      withTiming(1.04, { duration: 220 }),
      withTiming(1, { duration: 220 }),
      withTiming(1.03, { duration: 220 }),
      withTiming(1, { duration: 220 })
    );
  }, [heat, motion, pulse, progress]);

  const fill = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    transform: [{ scaleY: pulse.value }],
  }));

  return (
    <Animated.View style={[{ height, borderRadius: 999, overflow: "hidden", backgroundColor: colors.base }, fill]}>
      {heat > 0 ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: "42%",
            backgroundColor: colors.mid,
            opacity: 0.85,
          }}
        />
      ) : null}
      {heat > 1 ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: "22%",
            backgroundColor: colors.tip,
            opacity: 0.9,
          }}
        />
      ) : null}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, backgroundColor: "rgba(255,255,255,0.3)" }} />
      {heat >= 1 ? (
        <>
          <FireSpark delay={0} color={colors.spark} heat={heat} />
          <FireSpark delay={120} color={colors.tip} heat={heat} />
          <FireSpark delay={240} color={colors.spark} heat={heat} />
        </>
      ) : null}
    </Animated.View>
  );
}
