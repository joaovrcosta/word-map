import { useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme";
import { countLabel, type Word } from "../../types";

export const LEARNED_CONFIDENCE = 4;

export const RING_GREEN = "#24c875";
export const RING_YELLOW = "#F5C518";
export const RING_RED = "#FF4B6A";

export type LearningRingParts = {
  learned: number;
  almost: number;
  weak: number;
};

export function vaultLearningStats(words: ReadonlyArray<{ confidence: number }> | undefined | null) {
  const list = words ?? [];
  const total = list.length;
  let learned = 0;
  let almost = 0;
  let weak = 0;
  for (const word of list) {
    const level = Math.round(word.confidence);
    if (level >= LEARNED_CONFIDENCE) learned += 1;
    else if (level >= 3) almost += 1;
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
  labelColor?: string;
  showLabel?: boolean;
};

export function LearningProgressRing({
  percent,
  parts,
  size = 52,
  stroke = 3.5,
  color = "#4B7BFF",
  trackColor = "rgba(255,255,255,0.16)",
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
  const segments = rawSegments.reduce<
    Array<{ key: string; color: string; length: number; offset: number }>
  >((acc, segment) => {
    const length = (segment.count / segmentTotal) * circumference;
    const offset = acc.reduce((sum, item) => sum + item.length, 0);
    acc.push({ key: segment.key, color: segment.color, length, offset });
    return acc;
  }, []);

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
      </Svg>
      {showLabel ? (
        <Text
          style={{
            color: done ? RING_GREEN : labelColor,
            fontFamily: theme.fonts.bold,
            fontSize: size < 40 ? 9 : 11,
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
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "center",
          paddingHorizontal: 28,
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            borderRadius: 22,
            borderWidth: 1.5,
            borderColor: "#24c875",
            backgroundColor: "#1C1C1E",
            paddingHorizontal: 20,
            paddingTop: 22,
            paddingBottom: 18,
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontFamily: theme.fonts.bold,
              fontSize: 20,
              marginBottom: 10,
            }}
          >
            Progresso do vault 🌱
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.78)",
              fontFamily: theme.fonts.regular,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            O círculo mostra o status das palavras:{" "}
            <Text style={{ fontFamily: theme.fonts.bold, color: RING_GREEN }}>verde</Text> = nível 4
            (aprendidas),{" "}
            <Text style={{ fontFamily: theme.fonts.bold, color: RING_YELLOW }}>amarelo</Text> = nível 3
            (quase),{" "}
            <Text style={{ fontFamily: theme.fonts.bold, color: RING_RED }}>vermelho</Text> = níveis 1–2.
            Em 100% o anel fica todo verde.
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginTop: 22,
              marginBottom: 8,
            }}
          >
            <LearningProgressRing parts={{ learned: 1, almost: 1, weak: 2 }} size={56} />
            <Text style={{ color: "#FFFFFF", fontSize: 18 }}>→</Text>
            <LearningProgressRing parts={{ learned: 3, almost: 1, weak: 0 }} size={56} />
            <Text style={{ color: "#FFFFFF", fontSize: 18 }}>→</Text>
            <LearningProgressRing parts={{ learned: 4, almost: 0, weak: 0 }} size={56} />
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function LearningProgressLink({
  words,
  accent = "#4B7BFF",
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
          size={22}
          stroke={2.5}
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
