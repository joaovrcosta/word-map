import { Pressable, Text, View } from "react-native";
import { useTheme } from "../../../theme";
import { DuoButton } from "./duo-button";

export function ExitConfirm({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  const theme = useTheme();
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: theme.colors.background,
        justifyContent: "center",
        paddingHorizontal: 28,
      }}
    >
      <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 26, textAlign: "center" }}>
        Sair da lição?
      </Text>
      <Text
        style={{
          marginTop: 12,
          color: theme.colors.mutedForeground,
          fontFamily: theme.fonts.regular,
          fontSize: 16,
          lineHeight: 24,
          textAlign: "center",
        }}
      >
        Se você sair agora, nada desta lição será salvo.
      </Text>
      <View style={{ marginTop: 28 }}>
        <DuoButton label="CONTINUAR" onPress={onStay} color={theme.colors.green} />
        <Pressable onPress={onLeave} style={{ alignItems: "center", paddingVertical: 16 }}>
          <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.bold, fontSize: 15 }}>SAIR</Text>
        </Pressable>
      </View>
    </View>
  );
}
