import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "../src/session";
import { useTheme } from "../src/theme";

export default function LoginScreen() {
  const theme = useTheme();
  const { ready, user, signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.green} />
      </View>
    );
  }

  if (user) return <Redirect href="/home" />;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const message = await signIn(email.trim(), password);
      if (message) setError(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
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
            styles.subtitle,
            { color: theme.colors.mutedForeground, fontFamily: theme.fonts.regular },
          ]}
        >
          Entre para continuar lendo
        </Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={theme.colors.mutedForeground}
          value={email}
          onChangeText={setEmail}
          style={[
            styles.input,
            {
              color: theme.colors.foreground,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
              fontFamily: theme.fonts.regular,
              borderRadius: theme.radii.md,
            },
          ]}
        />
        <TextInput
          secureTextEntry
          placeholder="Senha"
          placeholderTextColor={theme.colors.mutedForeground}
          value={password}
          onChangeText={setPassword}
          style={[
            styles.input,
            {
              color: theme.colors.foreground,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
              fontFamily: theme.fonts.regular,
              borderRadius: theme.radii.md,
            },
          ]}
        />
        {error ? (
          <Text style={[styles.error, { color: theme.colors.destructive, fontFamily: theme.fonts.medium }]}>
            {error}
          </Text>
        ) : null}
        <Pressable
          disabled={submitting}
          onPress={() => void submit()}
          style={[
            styles.button,
            { backgroundColor: theme.colors.green, borderRadius: theme.radii.lg },
          ]}
        >
          <Text style={[styles.buttonLabel, { fontFamily: theme.fonts.bold }]}>
            {submitting ? "Entrando..." : "Entrar"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderWidth: 1,
    padding: 24,
  },
  title: {
    fontSize: 32,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 20,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  error: {
    marginBottom: 12,
    fontSize: 14,
  },
  button: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  buttonLabel: {
    color: "#ffffff",
    fontSize: 16,
  },
});
