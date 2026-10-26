import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Href, Redirect, router } from "expo-router";
import { getSharedPayloads } from "expo-sharing";
import { AuthShell, useAuthStyles } from "../src/auth-shell";
import { GoogleContinueButton } from "../src/google-continue";
import { useSession } from "../src/session";
import { useTheme } from "../src/theme";

export default function LoginScreen() {
  const theme = useTheme();
  const styles = useAuthStyles();
  const { ready, user, signIn, signInWithGoogle } = useSession();
  const [mode, setMode] = useState<"gate" | "email" | "username">("gate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [laterNote, setLaterNote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.shell.foreground} />
      </View>
    );
  }

  if (user) {
    try {
      if (getSharedPayloads().length > 0) {
        return <Redirect href={"/share" as Href} />;
      }
    } catch {
      // Expo Go / web sem share nativo
    }
    return <Redirect href={"/home" as Href} />;
  }

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

  const openEmail = () => {
    setLaterNote(null);
    setError(null);
    setMode("email");
  };

  const acceptGoogle = async (credential: string, chosen?: string) => {
    setSubmitting(true);
    setError(null);
    setLaterNote(null);
    try {
      const result = await signInWithGoogle(credential, chosen);
      if (result && "needsUsername" in result) {
        const suggestion = result.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
        setGoogleCredential(credential);
        setUsername(suggestion);
        setMode("username");
        return;
      }
      if (result?.error) setError(result.error);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar com o Google");
    } finally {
      setSubmitting(false);
    }
  };

  const submitUsername = () => {
    if (!googleCredential) return;
    void acceptGoogle(googleCredential, username);
  };

  const bubble =
    mode === "username" ? (
      <Text style={styles.bubbleText}>
        Esse <Text style={styles.bubbleAccent}>@</Text> aparece no ranking.
      </Text>
    ) : mode === "email" ? (
      <Text style={styles.bubbleText}>
        Entre com o email da sua <Text style={styles.bubbleAccent}>conta</Text>.
      </Text>
    ) : (
      <Text style={styles.bubbleText}>
        Crie sua conta para começar seu <Text style={styles.bubbleAccent}>mapa de palavras</Text>.
      </Text>
    );

  return (
    <AuthShell
      showBack={mode !== "gate"}
      onBack={() => {
        setError(null);
        setGoogleCredential(null);
        setMode("gate");
      }}
      bubble={bubble}
    >
      {mode === "gate" ? (
        <>
          <Text style={styles.hero}>Word Map</Text>
          <Text style={styles.heroSub}>Seu mapa de palavras</Text>

          <GoogleContinueButton
            disabled={submitting}
            onCredential={(credential) => void acceptGoogle(credential)}
            onError={setError}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={openEmail} style={styles.primaryButton}>
            <Ionicons name="mail" size={18} color={theme.shell.chipActiveText} />
            <Text style={styles.primaryLabel}>Entrar com email</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/register" as Href)} style={styles.secondaryButton}>
            <Text style={styles.secondaryLabel}>Criar conta</Text>
          </Pressable>

          <Text style={styles.legal}>
            Ao usar o Word Map, você confirma que leu e concorda com nossos{" "}
            <Text style={styles.legalLink}>Termos de Uso</Text> e{" "}
            <Text style={styles.legalLink}>Política de Privacidade</Text>.
          </Text>
          <Pressable
            onPress={() => setLaterNote("Para usar o Word Map, entre com seu email.")}
            style={styles.laterHit}
          >
            <Text style={styles.later}>Talvez mais tarde</Text>
          </Pressable>
          {laterNote ? <Text style={styles.laterNote}>{laterNote}</Text> : null}
        </>
      ) : mode === "username" ? (
        <>
          <Text style={styles.hero}>Escolha seu @</Text>
          <Text style={styles.heroSub}>Esse nome aparece no ranking.</Text>
          <TextInput
            autoCapitalize="none"
            autoFocus
            maxLength={20}
            placeholder="seuusuario"
            placeholderTextColor={theme.shell.muted}
            value={username}
            onChangeText={(value) => setUsername(value.replace(/^@+/, "").replace(/\s/g, ""))}
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={submitting} onPress={submitUsername} style={styles.primaryButton}>
            <Text style={styles.primaryLabel}>{submitting ? "Salvando..." : "Concluir"}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.hero}>Entrar</Text>
          <Text style={styles.heroSub}>Use o email da sua conta.</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoFocus
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor={theme.shell.muted}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            secureTextEntry
            placeholder="Senha"
            placeholderTextColor={theme.shell.muted}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={submitting} onPress={() => void submit()} style={styles.primaryButton}>
            <Text style={styles.primaryLabel}>{submitting ? "Entrando..." : "Entrar"}</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/register" as Href)} style={styles.switchHit}>
            <Text style={styles.switchText}>
              Não tem conta? <Text style={styles.switchLink}>Criar conta</Text>
            </Text>
          </Pressable>
        </>
      )}
    </AuthShell>
  );
}
