import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Redirect, router } from "expo-router";
import { AuthShell, useAuthStyles } from "../src/auth-shell";
import { useSession } from "../src/session";
import { useTheme } from "../src/theme";

export default function RegisterScreen() {
  const theme = useTheme();
  const styles = useAuthStyles();
  const { ready, user, signUp } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.shell.foreground} />
      </View>
    );
  }

  if (user) return <Redirect href="/home" />;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (!name.trim() || !email.trim() || !username.trim() || !password) {
        setError("Preencha todos os campos.");
        return;
      }
      if (password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
      const message = await signUp({ name, email, username, password });
      if (message) {
        setError(
          /já está em uso/i.test(message)
            ? `${message} Tente entrar ou use outro email.`
            : message
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar a conta");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      showBack
      onBack={() => router.back()}
      bubble={
        <Text style={styles.bubbleText}>
          Escolha um <Text style={styles.bubbleAccent}>@</Text> e comece seu mapa de palavras.
        </Text>
      }
    >
      <Text style={styles.hero}>Criar conta</Text>
      <Text style={styles.heroSub}>Leva só um minuto.</Text>

      <TextInput
        autoCapitalize="words"
        autoComplete="name"
        placeholder="Nome"
        placeholderTextColor={theme.shell.muted}
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor={theme.shell.muted}
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={20}
        placeholder="@usuario"
        placeholderTextColor={theme.shell.muted}
        value={username}
        onChangeText={(value) => setUsername(value.replace(/^@+/, "").replace(/\s/g, ""))}
        style={styles.input}
      />
      <TextInput
        secureTextEntry
        autoComplete="new-password"
        placeholder="Senha (mín. 6 caracteres)"
        placeholderTextColor={theme.shell.muted}
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable disabled={submitting} onPress={() => void submit()} style={styles.primaryButton}>
        <Text style={styles.primaryLabel}>{submitting ? "Criando..." : "Criar conta"}</Text>
      </Pressable>

      <Text style={styles.legal}>
        Ao criar a conta, você confirma que leu e concorda com nossos{" "}
        <Text style={styles.legalLink}>Termos de Uso</Text> e{" "}
        <Text style={styles.legalLink}>Política de Privacidade</Text>.
      </Text>

      <Pressable onPress={() => router.replace("/")} style={styles.switchHit}>
        <Text style={styles.switchText}>
          Já tem conta? <Text style={styles.switchLink}>Entrar</Text>
        </Text>
      </Pressable>
    </AuthShell>
  );
}
