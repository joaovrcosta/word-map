import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "./theme";
import { useTabBarInset } from "./ui";

const DISMISS_DRAG = 80;
const SHEET_OFFSCREEN = 640;

export const SHEET_BG = "#0B0B0B";
export const SHEET_CARD = "#2C2C2E";

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  titleRight?: ReactNode;
  maxHeight?: `${number}%` | number;
  contentStyle?: StyleProp<ViewStyle>;
  /** Área sob o handle (título padrão, ou custom). */
  header?: ReactNode;
  showHandle?: boolean;
};

export function AppBottomSheet({
  visible,
  onClose,
  children,
  title,
  titleRight,
  maxHeight = "88%",
  contentStyle,
  header,
  showHandle = true,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(SHEET_OFFSCREEN)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const finishClose = () => {
    closingRef.current = false;
    setMounted(false);
    translateY.setValue(SHEET_OFFSCREEN);
    dragY.setValue(0);
    backdrop.setValue(0);
    onCloseRef.current();
  };

  const animateClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: SHEET_OFFSCREEN,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(dragY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) finishClose();
      else closingRef.current = false;
    });
  };

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setMounted(true);
      return;
    }
    if (mounted && !closingRef.current) {
      animateClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to visible
  }, [visible]);

  useEffect(() => {
    if (!mounted || !visible || closingRef.current) return;
    dragY.setValue(0);
    translateY.setValue(SHEET_OFFSCREEN);
    backdrop.setValue(0);
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [mounted, visible, backdrop, dragY, translateY]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragY.stopAnimation();
      },
      onPanResponderMove: (_, gesture) => {
        dragY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_DRAG || gesture.vy > 0.95) {
          closingRef.current = true;
          Animated.parallel([
            Animated.timing(backdrop, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.timing(dragY, {
              toValue: SHEET_OFFSCREEN,
              duration: 200,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
          ]).start(({ finished }) => {
            if (finished) finishClose();
            else closingRef.current = false;
          });
          return;
        }
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
        }).start();
      },
    })
  ).current;

  if (!mounted) return null;

  const bottomPad = Math.max(18, tabInset || insets.bottom + 10);
  const sheetY = Animated.add(translateY, dragY);

  return (
    <Modal
      animationType="none"
      transparent
      visible={mounted}
      onRequestClose={animateClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdropDim, { opacity: backdrop }]}
        />
        <Pressable
          accessibilityLabel="Fechar"
          accessibilityRole="button"
          onPress={animateClose}
          style={styles.backdropHit}
        >
          <View style={styles.backdropFill} />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: SHEET_BG,
              borderColor: theme.shell.line,
              maxHeight,
              paddingBottom: bottomPad,
              transform: [{ translateY: sheetY }],
            },
            contentStyle,
          ]}
        >
          <View {...pan.panHandlers} style={styles.grab}>
            {showHandle ? (
              <View style={[styles.handle, { backgroundColor: "rgba(255,255,255,0.28)" }]} />
            ) : null}
            {header !== undefined ? (
              header
            ) : title ? (
              <View style={styles.titleRow}>
                <Text
                  style={[styles.title, { fontFamily: theme.fonts.bold }]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {titleRight}
              </View>
            ) : null}
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  backdropHit: {
    flex: 1,
  },
  backdropFill: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  grab: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 24,
  },
});
