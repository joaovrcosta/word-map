import { type ReactNode } from "react";
import { Pressable, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTheme } from "../../../theme";
import { useMotionEnabled } from "../motion";

export const BUTTON_EDGE = "#14804a";

export function DuoButton({
  label,
  onPress,
  disabled = false,
  color,
  edge = BUTTON_EDGE,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color: string;
  edge?: string;
}) {
  const theme = useTheme();
  const motion = useMotionEnabled();
  const press = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * 4 }],
    borderBottomWidth: 4 - press.value * 4,
  }));

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        if (motion) press.value = withTiming(1, { duration: 60 });
      }}
      onPressOut={() => {
        press.value = motion ? withTiming(0, { duration: 120 }) : 0;
      }}
      onPress={onPress}
    >
      <Animated.View
        style={[
          {
            height: 52,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: color,
            borderBottomColor: edge,
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        <Text style={{ color: "#ffffff", fontFamily: theme.fonts.bold, fontSize: 16, letterSpacing: 0.6 }}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function PressScale({
  children,
  disabled,
  onPress,
  style,
}: {
  children: ReactNode;
  disabled?: boolean;
  onPress: () => void;
  style?: object;
}) {
  const motion = useMotionEnabled();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        if (motion) scale.value = withTiming(0.97, { duration: 60 });
      }}
      onPressOut={() => {
        scale.value = motion ? withTiming(1, { duration: 100 }) : 1;
      }}
      onPress={onPress}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}
