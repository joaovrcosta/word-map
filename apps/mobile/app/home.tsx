import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "../src/session";
import { useTheme } from "../src/theme";

export default function HomeScreen() {
  const theme = useTheme();
  const { ready, user, signOut } = useSession();

  if (ready && !user) return <Redirect href="/" />;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.lg,
          },
        ]}
      >
        <Text
          style={[
            styles.title,
            { color: theme.colors.foreground, fontFamily: theme.fonts.bold },
          ]}
        >
          Word Map
        </Text>
        <Text
          style={[
            styles.body,
            { color: theme.colors.mutedForeground, fontFamily: theme.fonts.regular },
          ]}
        >
          {user ? `Olá, ${user.name}.` : "Carregando..."} A leitura chega na próxima leva, já com estas cores.
        </Text>
      </View>
      <Pressable
        onPress={() => void signOut()}
        style={[
          styles.button,
          { backgroundColor: theme.colors.green, borderRadius: theme.radii.lg },
        ]}
      >
        <Text style={[styles.buttonLabel, { fontFamily: theme.fonts.bold }]}>Sair</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    borderWidth: 1,
    padding: 24,
  },
  title: {
    fontSize: 32,
  },
  body: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 14,
  },
  buttonLabel: {
    color: "#ffffff",
    fontSize: 16,
  },
});
