import { Text, View } from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useTheme } from "../../../theme";
import { BUTTON_EDGE, DuoButton } from "./duo-button";
import { useMotionEnabled } from "../motion";

export function FeedbackBanner({
  correct,
  answer,
  onContinue,
}: {
  correct: boolean;
  answer?: string;
  onContinue: () => void;
}) {
  const theme = useTheme();
  const motion = useMotionEnabled();
  const background = correct ? theme.colors.greenSoft : "#3a1618";
  const color = correct ? theme.colors.greenText : theme.colors.destructive;

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
      <Text style={{ color, fontFamily: theme.fonts.bold, fontSize: 18 }}>{correct ? "Muito bem!" : "Resposta correta:"}</Text>
      {!correct && answer ? (
        <Text style={{ marginTop: 4, color: theme.colors.foreground, fontFamily: theme.fonts.semibold, fontSize: 16 }}>{answer}</Text>
      ) : null}
      <View style={{ marginTop: 16 }}>
        <DuoButton
          label="CONTINUAR"
          onPress={onContinue}
          color={correct ? theme.colors.green : theme.colors.destructive}
          edge={correct ? BUTTON_EDGE : "#9f1239"}
        />
      </View>
    </Animated.View>
  );
}
