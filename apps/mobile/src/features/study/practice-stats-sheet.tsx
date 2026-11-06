import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { brand } from "@word-map/design-tokens";
import Svg, { Circle } from "react-native-svg";
import { AppBottomSheet, SHEET_BG, SHEET_CARD } from "../../bottom-sheet";
import { useSession } from "../../session";
import { useTheme } from "../../theme";
import { countLabel } from "../../types";
import {
  DAILY_WORD_GOAL,
  type DayPracticeState,
  type PracticeXpState,
  readDayPractice,
} from "./practice-xp";

const RING = 92;
const STROKE = 7;
const RADIUS = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;
const ACCENT = brand.green;

type Props = {
  visible: boolean;
  onClose: () => void;
  streak: number;
  xp: PracticeXpState;
  onChangeGoal: () => void;
};

export function PracticeStatsSheet({ visible, onClose, streak, xp, onChangeGoal }: Props) {
  const theme = useTheme();
  const { user } = useSession();
  const [day, setDay] = useState<DayPracticeState>({ day: "", xp: 0, words: [] });

  useEffect(() => {
    if (!visible) return;
    void readDayPractice(user?.id).then(setDay);
  }, [visible, user?.id]);

  const reviewed = day.words.length;
  const goal = DAILY_WORD_GOAL;
  const progress = Math.min(1, reviewed / Math.max(1, goal));
  const ringOffset = CIRC * (1 - progress);
  const chips = useMemo(() => day.words, [day.words]);

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      title="Progresso de hoje"
      titleRight={
        <Pressable onPress={onChangeGoal} hitSlop={8}>
          <Text style={[styles.goalLink, { fontFamily: theme.fonts.medium }]}>Alterar meta</Text>
        </Pressable>
      }
    >
      <View style={[styles.card, { backgroundColor: SHEET_CARD }]}>
        <View style={styles.statsCol}>
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
              stroke={ACCENT}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${CIRC} ${CIRC}`}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          </Svg>
          <Text style={[styles.ringLabel, { fontFamily: theme.fonts.bold }]}>
            {reviewed}/{goal}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.bold }]}>Revisadas hoje</Text>
      <View style={[styles.reviewedCard, { backgroundColor: SHEET_CARD }]}>
        {chips.length === 0 ? (
          <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 14 }}>
            Ainda não revisou palavras hoje. Continue praticando!
          </Text>
        ) : (
          <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false} bounces={false}>
            <View style={styles.chipWrap}>
              {chips.map((word) => (
                <View key={word.id} style={[styles.chip, { backgroundColor: SHEET_BG }]}>
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
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  goalLink: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
  },
  card: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statsCol: {
    flex: 1,
    gap: 18,
  },
  statValue: { color: "#FFFFFF", fontSize: 28, lineHeight: 32 },
  statLabel: {
    marginTop: 2,
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  ringWrap: {
    width: RING,
    height: RING,
    alignItems: "center",
    justifyContent: "center",
  },
  ringLabel: {
    color: "#FFFFFF",
    fontSize: 22,
  },
  sectionTitle: {
    marginTop: 22,
    marginBottom: 12,
    color: "#FFFFFF",
    fontSize: 22,
  },
  reviewedCard: {
    borderRadius: 20,
    padding: 18,
    minHeight: 140,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
