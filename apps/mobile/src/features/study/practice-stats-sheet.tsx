import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme";
import { countLabel } from "../../types";
import { useTabBarInset } from "../../ui";
import {
  DAILY_WORD_GOAL,
  type DayPracticeState,
  type PracticeXpState,
  readDayPractice,
} from "./practice-xp";

const RING = 92;
const STROKE = 8;
const RADIUS = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;
const CHIP_TONES = ["#7C5CFF", "#1CB0F6", "#FF4B6A", "#24c875", "#FF9600", "#A78BFA"];
const DISMISS_DRAG = 96;

type Props = {
  visible: boolean;
  onClose: () => void;
  streak: number;
  xp: PracticeXpState;
  onChangeGoal: () => void;
};

export function PracticeStatsSheet({ visible, onClose, streak, xp, onChangeGoal }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const [day, setDay] = useState<DayPracticeState>({ day: "", xp: 0, words: [] });
  const dragY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible) return;
    dragY.setValue(0);
    void readDayPractice().then(setDay);
  }, [visible, dragY]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        dragY.setValue(Math.max(0, gesture.dy));
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_DRAG || gesture.vy > 1.1) {
          Animated.timing(dragY, {
            toValue: 560,
            duration: 180,
            useNativeDriver: true,
          }).start(() => onCloseRef.current());
          return;
        }
        Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      },
    })
  ).current;

  const reviewed = day.words.length;
  const goal = DAILY_WORD_GOAL;
  const progress = Math.min(1, reviewed / Math.max(1, goal));
  const ringOffset = CIRC * (1 - progress);

  const chips = useMemo(
    () =>
      day.words.map((word, index) => ({
        ...word,
        tone: CHIP_TONES[index % CHIP_TONES.length]!,
      })),
    [day.words]
  );

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable accessibilityLabel="Fechar" onPress={onClose} style={styles.backdrop} />
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.shell.surface,
              borderColor: theme.shell.line,
              paddingBottom: Math.max(20, tabInset || insets.bottom + 10),
              transform: [{ translateY: dragY }],
            },
          ]}
        >
          <View {...pan.panHandlers} style={styles.grab}>
            <View style={[styles.handle, { backgroundColor: theme.shell.line }]} />
            <View style={styles.headerRow}>
              <Text style={[styles.title, { fontFamily: theme.fonts.bold }]}>Progresso de hoje</Text>
              <Pressable onPress={onChangeGoal} hitSlop={8}>
                <Text style={{ color: theme.colors.green, fontFamily: theme.fonts.semibold, fontSize: 13 }}>
                  Alterar meta
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: "#18181A", borderColor: theme.shell.line }]}>
            <View style={{ flex: 1, gap: 16 }}>
              <View>
                <Text style={[styles.statValue, { fontFamily: theme.fonts.bold }]}>
                  {countLabel(reviewed, "palavra", "palavras")}
                </Text>
                <Text style={[styles.statLabel, { fontFamily: theme.fonts.medium }]}>REVISADAS HOJE</Text>
              </View>
              <View>
                <Text style={[styles.statValue, { fontFamily: theme.fonts.bold }]}>{day.xp} XP</Text>
                <Text style={[styles.statLabel, { fontFamily: theme.fonts.medium }]}>GANHOS HOJE</Text>
              </View>
              <View>
                <Text style={[styles.statValue, { fontFamily: theme.fonts.bold }]}>{streak} dias</Text>
                <Text style={[styles.statLabel, { fontFamily: theme.fonts.medium }]}>OFENSIVA</Text>
              </View>
            </View>

            <View style={styles.ringWrap}>
              <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RADIUS}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={STROKE}
                  fill="none"
                />
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={RADIUS}
                  stroke={theme.colors.green}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeDasharray={`${CIRC} ${CIRC}`}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
                />
              </Svg>
              <Text style={{ color: "#FFFFFF", fontFamily: theme.fonts.bold, fontSize: 22 }}>
                {reviewed}/{goal}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.bold }]}>Revisadas hoje</Text>
          <View style={[styles.reviewedCard, { backgroundColor: "#18181A", borderColor: theme.shell.line }]}>
            {chips.length === 0 ? (
              <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 14 }}>
                Ainda não revisou palavras hoje. Continue praticando!
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false} bounces={false}>
                <View style={styles.chipWrap}>
                  {chips.map((word) => (
                    <View
                      key={word.id}
                      style={[styles.chip, { backgroundColor: `${word.tone}33`, borderColor: `${word.tone}88` }]}
                    >
                      <Text style={{ color: "#FFFFFF", fontFamily: theme.fonts.semibold, fontSize: 14 }}>
                        {word.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          <Text style={{ marginTop: 14, color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 13 }}>
            Nível {xp.level} · {xp.xpInLevel}/{xp.xpForLevel} XP neste nível · total {xp.totalXp} XP
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: "88%",
    zIndex: 2,
  },
  grab: {
    paddingTop: 4,
    paddingBottom: 2,
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: { color: "#FFFFFF", fontSize: 22 },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statValue: { color: "#FFFFFF", fontSize: 22 },
  statLabel: {
    marginTop: 2,
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  ringWrap: {
    width: RING,
    height: RING,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    color: "#FFFFFF",
    fontSize: 18,
  },
  reviewedCard: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    minHeight: 120,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
