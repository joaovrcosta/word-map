import { Text, View } from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useTheme } from "../../../theme";
import { BUTTON_EDGE, DuoButton } from "./duo-button";
import { useMotionEnabled } from "../motion";

export function FeedbackBanner({
  correct,
  partial = false,
  answer,
  onContinue,
}: {
  correct: boolean;
  /** Aprovado com ≥70% (fala), sem ser perfeito. */
  partial?: boolean;
  answer?: string;
  onContinue: () => void;
}) {
  const theme = useTheme();
  const motion = useMotionEnabled();
  const kind = correct ? (partial ? "partial" : "correct") : "wrong";
  const background =
    kind === "correct" ? theme.colors.greenSoft : kind === "partial" ? "#2a2416" : "#3a1618";
  const color =
    kind === "correct" ? theme.colors.greenText : kind === "partial" ? "#E8C547" : theme.colors.destructive;
  const title =
    kind === "correct" ? "Muito bem!" : kind === "partial" ? "Parcialmente correto" : "Resposta correta:";
  const buttonColor =
    kind === "correct" ? theme.colors.green : kind === "partial" ? "#C9A227" : theme.colors.destructive;
  const buttonEdge = kind === "correct" ? BUTTON_EDGE : kind === "partial" ? "#8a7018" : "#9f1239";

  return (
    <Animated.View
      entering={motion ? SlideInDown.duration(220) : undefined}
      exiting={motion ? SlideOutDown.duration(180) : undefined}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}
    >
      <Text style={{ color, fontFamily: theme.fonts.bold, fontSize: 18 }}>{title}</Text>
      {(kind === "wrong" || kind === "partial") && answer ? (
        <Text style={{ marginTop: 4, color: theme.colors.foreground, fontFamily: theme.fonts.semibold, fontSize: 16 }}>
          {answer}
        </Text>
      ) : null}
      <View style={{ marginTop: 16 }}>
        <DuoButton label="CONTINUAR" onPress={onContinue} color={buttonColor} edge={buttonEdge} />
      </View>
    </Animated.View>
  );
}
