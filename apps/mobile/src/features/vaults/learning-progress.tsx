import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { LEARNING_STATUS_META } from "@word-map/shared/learning-status";
import { resolveLearningStatusFromWord } from "@word-map/shared/fsrs-schedule";
import { AppBottomSheet, SHEET_CARD } from "../../bottom-sheet";
import { useTheme } from "../../theme";
import { countLabel, type Word } from "../../types";

export const LEARNED_CONFIDENCE = 4;

/** Cores dos segmentos = mesmas das tags FSRS. */
export const RING_GREEN = LEARNING_STATUS_META.confident.color;
export const RING_YELLOW = LEARNING_STATUS_META.reviewing.color;
export const RING_RED = LEARNING_STATUS_META.learning.color;

export type LearningRingParts = {
  learned: number;
  almost: number;
  weak: number;
};

type WordForRing = {
  confidence?: number;
  fsrsState?: number | null;
  stability?: number | null;
  dueAt?: Date | string | null;
  lastPractice?: Date | string | null;
  lastReview?: Date | string | null;
};

export function vaultLearningStats(words: ReadonlyArray<WordForRing> | undefined | null) {
  const list = words ?? [];
  const total = list.length;
  let learned = 0;
  let almost = 0;
  let weak = 0;
  for (const word of list) {
    const status = resolveLearningStatusFromWord(word);
    if (status === "confident") learned += 1;
    else if (status === "reviewing") almost += 1;
    else weak += 1;
  }
  const percent = total === 0 ? 0 : Math.round((learned / total) * 100);
  return { total, learned, almost, weak, percent };
}

type RingProps = {
  percent?: number;
  parts?: LearningRingParts;
  size?: number;
  stroke?: number;
  /** Usado só no modo legado (percent sem parts). */
  color?: string;
  trackColor?: string;
  dividerColor?: string;
  labelColor?: string;
  showLabel?: boolean;
};

export function LearningProgressRing({
  percent,
  parts,
  size = 44,
  stroke = 4.5,
  color = RING_YELLOW,
  trackColor = "rgba(255,255,255,0.16)",
  dividerColor,
  labelColor = "#FFFFFF",
  showLabel = true,
}: RingProps) {
  const theme = useTheme();
  const totalParts = parts ? parts.learned + parts.almost + parts.weak : 0;
  const labelPercent =
    parts && totalParts > 0
      ? Math.round((parts.learned / totalParts) * 100)
      : Math.min(100, Math.max(0, percent ?? 0));
  const done = labelPercent >= 100 && (parts ? parts.almost === 0 && parts.weak === 0 : true);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;
  const cutColor = dividerColor ?? theme.shell.background;

  const rawSegments =
    parts && totalParts > 0
      ? [
          { key: "learned", count: parts.learned, color: RING_GREEN },
          { key: "almost", count: parts.almost, color: RING_YELLOW },
          { key: "weak", count: parts.weak, color: RING_RED },
        ].filter((item) => item.count > 0)
      : labelPercent > 0
        ? [{ key: "legacy", count: labelPercent, color: done ? RING_GREEN : color }]
        : [];

  const segmentTotal = parts && totalParts > 0 ? totalParts : 100;
  const gap = rawSegments.length > 1 ? Math.min(1.6, circumference * 0.012) : 0;

  const segments: Array<{ key: string; color: string; length: number; offset: number }> = [];
  const dividers: number[] = [];
  let cursor = 0;
  for (const segment of rawSegments) {
    const share = (segment.count / segmentTotal) * circumference;
    const length = Math.max(0, share - gap);
    const offset = cursor + gap / 2;
    segments.push({ key: segment.key, color: segment.color, length, offset });
    if (gap > 0) dividers.push(cursor);
    cursor += share;
  }

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        {segments.map((segment) => (
          <Circle
            key={segment.key}
            cx={cx}
            cy={cy}
            r={radius}
            stroke={segment.color}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${segment.length} ${Math.max(0, circumference - segment.length)}`}
            strokeDashoffset={-segment.offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        {dividers.map((offset, index) => (
          <Circle
            key={`div-${index}`}
            cx={cx}
            cy={cy}
            r={radius}
            stroke={cutColor}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${gap} ${Math.max(0, circumference - gap)}`}
            strokeDashoffset={-(offset - gap / 2)}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
      </Svg>
      {showLabel ? (
        <Text
          style={{
            color: labelColor,
            fontFamily: theme.fonts.bold,
            fontSize: size < 36 ? 9 : 10,
          }}
        >
          {labelPercent}%
        </Text>
      ) : null}
    </View>
  );
}

export function LearningProgressExplainModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();

  return (
    <AppBottomSheet visible={visible} onClose={onClose} title="Progresso do vault">
      <Text
        style={{
          color: "rgba(255,255,255,0.78)",
          fontFamily: theme.fonts.regular,
          fontSize: 15,
          lineHeight: 22,
        }}
      >
        O círculo mostra o status das palavras:{" "}
        <Text style={{ fontFamily: theme.fonts.bold, color: RING_GREEN }}>verde</Text> = CONFIDENT
        (aprendidas),{" "}
        <Text style={{ fontFamily: theme.fonts.bold, color: RING_YELLOW }}>azul</Text> = REVIEWING
        (quase),{" "}
        <Text style={{ fontFamily: theme.fonts.bold, color: RING_RED }}>magenta</Text> = LEARNING /
        RELEARNING / NEW. Em 100% o anel fica todo verde.
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginTop: 22,
          marginBottom: 8,
          backgroundColor: SHEET_CARD,
          borderRadius: 20,
          paddingVertical: 18,
        }}
      >
        <LearningProgressRing parts={{ learned: 1, almost: 1, weak: 2 }} size={48} />
        <Text style={{ color: "#FFFFFF", fontSize: 18 }}>→</Text>
        <LearningProgressRing parts={{ learned: 3, almost: 1, weak: 0 }} size={48} />
        <Text style={{ color: "#FFFFFF", fontSize: 18 }}>→</Text>
        <LearningProgressRing parts={{ learned: 4, almost: 0, weak: 0 }} size={48} />
      </View>

      <Pressable
        onPress={onClose}
        style={{
          marginTop: 18,
          height: 48,
          borderRadius: 14,
          backgroundColor: "#E8E8E8",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#111", fontFamily: theme.fonts.bold, fontSize: 16 }}>Entendi</Text>
      </Pressable>
    </AppBottomSheet>
  );
}

export function LearningProgressLink({
  words,
  accent = RING_GREEN,
}: {
  words: Word[];
  accent?: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const stats = useMemo(() => vaultLearningStats(words), [words]);
  const label = `${countLabel(stats.total, "palavra", "palavras")}, ${stats.percent}% aprendido`;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" }}
      >
        <LearningProgressRing
          parts={{ learned: stats.learned, almost: stats.almost, weak: stats.weak }}
          size={18}
          stroke={3.5}
          color={accent}
          showLabel={false}
        />
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: theme.fonts.medium,
            fontSize: 14,
            textDecorationLine: "underline",
          }}
        >
          {label}
        </Text>
      </Pressable>
      <LearningProgressExplainModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
