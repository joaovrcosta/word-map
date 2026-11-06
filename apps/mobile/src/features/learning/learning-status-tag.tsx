import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import {
  LEARNING_STATUS_ORDER,
  learningStatusMeta,
  learningStatusMetaForWord,
  type LearningStatusId,
  type LearningStatusMeta,
} from "@word-map/shared/learning-status";
import { resolveLearningStatusFromWord } from "@word-map/shared/fsrs-schedule";
import { useTheme } from "../../theme";

const ICONS: Record<LearningStatusMeta["icon"], keyof typeof Ionicons.glyphMap> = {
  star: "star",
  ellipse: "ellipse-outline",
  refresh: "refresh",
  "checkmark-circle": "checkmark-circle",
};

type Size = "compact" | "md";

export function LearningStatusTag({
  status,
  word,
  size = "compact",
  style,
}: {
  status?: LearningStatusId;
  word?: {
    fsrsState?: number | null;
    stability?: number | null;
    dueAt?: Date | string | null;
    lastPractice?: Date | string | null;
    lastReview?: Date | string | null;
    confidence?: number;
  };
  size?: Size;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const meta = status ? learningStatusMeta(status) : learningStatusMetaForWord(word ?? {});
  const padH = size === "md" ? 10 : 8;
  const padV = size === "md" ? 6 : 4;
  const fontSize = size === "md" ? 12 : 10;
  const iconSize = size === "md" ? 14 : 11;

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          alignSelf: "flex-start",
          backgroundColor: meta.color,
          borderRadius: 999,
          paddingHorizontal: padH,
          paddingVertical: padV,
        },
        style,
      ]}
    >
      <Ionicons name={ICONS[meta.icon]} size={iconSize} color="#FFFFFF" />
      <Text
        style={{
          color: "#FFFFFF",
          fontFamily: theme.fonts.bold,
          fontSize,
          letterSpacing: 0.4,
        }}
      >
        {meta.label}
      </Text>
    </View>
  );
}

export function LearningStatusChooser({
  value,
  onChange,
}: {
  value: LearningStatusId;
  onChange: (status: LearningStatusId) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {LEARNING_STATUS_ORDER.map((id) => {
        const meta = learningStatusMeta(id);
        const selected = id === value;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 4,
              opacity: selected ? 1 : 0.7,
            }}
          >
            <LearningStatusTag status={id} size="md" />
            <Text
              style={{
                flex: 1,
                color: selected ? theme.shell.foreground : theme.shell.muted,
                fontFamily: selected ? theme.fonts.semibold : theme.fonts.medium,
                fontSize: 13,
              }}
            >
              {meta.description}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function statusIdFromWord(word: {
  fsrsState?: number | null;
  stability?: number | null;
  dueAt?: Date | string | null;
  lastPractice?: Date | string | null;
  lastReview?: Date | string | null;
  confidence?: number;
}): LearningStatusId {
  return resolveLearningStatusFromWord(word);
}
