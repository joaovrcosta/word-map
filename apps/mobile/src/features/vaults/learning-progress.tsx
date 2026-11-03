import { useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme";
import { countLabel, type Word } from "../../types";

export const LEARNED_CONFIDENCE = 4;

export function vaultLearningStats(words: Word[] | undefined | null) {
  const list = words ?? [];
  const total = list.length;
  const learned = list.filter((word) => Math.round(word.confidence) >= LEARNED_CONFIDENCE).length;
  const percent = total === 0 ? 0 : Math.round((learned / total) * 100);
  return { total, learned, percent };
}

type RingProps = {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  labelColor?: string;
  showLabel?: boolean;
};

export function LearningProgressRing({
  percent,
  size = 52,
  stroke = 3.5,
  color = "#4B7BFF",
  trackColor = "rgba(255,255,255,0.16)",
  labelColor = "#FFFFFF",
  showLabel = true,
}: RingProps) {
  const theme = useTheme();
  const clamped = Math.min(100, Math.max(0, percent));
  const done = clamped >= 100;
  const ringColor = done ? "#24c875" : color;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        {clamped > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      {showLabel ? (
        <Text
          style={{
            color: labelColor,
            fontFamily: theme.fonts.bold,
            fontSize: size < 40 ? 9 : 11,
          }}
        >
          {clamped}%
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
            Este círculo mostra o{" "}
            <Text style={{ fontFamily: theme.fonts.bold, color: "#FFFFFF" }}>status de aprendizado</Text>{" "}
            das palavras do vault. Complete o vault aprendendo todas as palavras (nível 4).
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
            <LearningProgressRing percent={0} size={56} color="#4B7BFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 18 }}>→</Text>
            <LearningProgressRing percent={80} size={56} color="#4B7BFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 18 }}>→</Text>
            <LearningProgressRing percent={100} size={56} />
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
  const { total, percent } = useMemo(() => vaultLearningStats(words), [words]);
  const label = `${countLabel(total, "palavra", "palavras")}, ${percent}% aprendido`;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" }}
      >
        <LearningProgressRing percent={percent} size={22} stroke={2.5} color={accent} showLabel={false} />
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
