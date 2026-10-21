import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useTheme } from "../../../theme";
import { useMotionEnabled } from "../motion";

export function CloseButton({ onPress, label = "Fechar" }: { onPress: () => void; label?: string }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={8}
      style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name="close" size={30} color={theme.colors.foreground} />
    </Pressable>
  );
}

export function EnergyMark() {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      <Ionicons name="flash" size={22} color="#1cb0f6" />
      <Text style={{ color: "#1cb0f6", fontFamily: theme.fonts.bold, fontSize: 22, lineHeight: 26 }}>∞</Text>
    </View>
  );
}

export function StreakChip({ streak }: { streak: number }) {
  const scale = useSharedValue(1);
  const motion = useMotionEnabled();

  useEffect(() => {
    if (streak > 0 && motion) scale.value = withSequence(withTiming(1.12, { duration: 120 }), withTiming(1, { duration: 140 }));
  }, [motion, scale, streak]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const theme = useTheme();
  if (streak < 2) return null;

  return (
    <Animated.View style={[{ flexDirection: "row", alignItems: "center", gap: 4 }, style]}>
      <Ionicons name="flame" size={20} color="#ff9600" />
      <Text style={{ color: "#ff9600", fontFamily: theme.fonts.bold, fontSize: 16 }}>{streak}</Text>
    </Animated.View>
  );
}

export const CHALLENGE_XP = 10;

export function XpFloat({ token }: { token: number }) {
  const motion = useMotionEnabled();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (token === 0) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: motion ? 700 : 0 });
  }, [motion, progress, token]);

  const style = useAnimatedStyle(() => ({
    opacity: token === 0 ? 0 : 1 - progress.value,
    transform: [{ translateY: -40 * progress.value }],
  }));

  const theme = useTheme();
  if (token === 0) return null;
  return (
    <Animated.Text style={[{ position: "absolute", right: 0, top: -4, color: "#ff9600", fontFamily: theme.fonts.bold, fontSize: 14 }, style]}>
      +{CHALLENGE_XP}
    </Animated.Text>
  );
}
