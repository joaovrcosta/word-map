import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleContinueButton } from "../src/google-continue";
import { useSession } from "../src/session";

const background = "#141414";
const line = "#3a3a3a";
const muted = "#9a9a9a";
const orange = "#ff9f1a";

function Mascot() {
  return (
    <View style={styles.mascot}>
      <View style={styles.mascotBody} />
      <View style={styles.mascotEar} />
      <View style={[styles.eye, { left: 18 }]} />
      <View style={[styles.eye, { left: 40 }]} />
      <View style={[styles.pupil, { left: 24 }]} />
      <View style={[styles.pupil, { left: 46 }]} />
      <View style={styles.laptop} />
      <View style={styles.laptopBase} />
    </View>
  );
}

function Bubble() {
  return (
    <View style={styles.bubble}>
      <Text style={styles.bubbleText}>
        Crie sua conta para começar seu <Text style={styles.bubbleAccent}>mapa de palavras</Text>.
      </Text>
    </View>
  );
}

export default function LoginScreen() {
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
        <StatusBar style="light" />
        <ActivityIndicator color="#ffffff" />
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

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Voltar"
              disabled={mode === "gate"}
              onPress={() => {
                setError(null);
                setGoogleCredential(null);
                setMode("gate");
              }}
              hitSlop={8}
              style={styles.back}
            >
              <Ionicons name="chevron-back" size={28} color="#ffffff" />
            </Pressable>
            <View style={styles.ring} />
          </View>

          <View style={styles.intro}>
            <Mascot />
            <Bubble />
          </View>

          <View style={styles.footer}>
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
                <Pressable onPress={openEmail} style={styles.appleButton}>
                  <Ionicons name="mail" size={18} color="#111111" />
                  <Text style={styles.appleLabel}>Entrar com email</Text>
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
                  placeholderTextColor={muted}
                  value={username}
                  onChangeText={(value) => setUsername(value.replace(/^@+/, "").replace(/\s/g, ""))}
                  style={styles.input}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable disabled={submitting} onPress={submitUsername} style={styles.appleButton}>
                  <Text style={styles.appleLabel}>{submitting ? "Salvando..." : "Concluir"}</Text>
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
                  placeholderTextColor={muted}
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                />
                <TextInput
                  secureTextEntry
                  placeholder="Senha"
                  placeholderTextColor={muted}
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Pressable disabled={submitting} onPress={() => void submit()} style={styles.appleButton}>
                  <Text style={styles.appleLabel}>{submitting ? "Entrando..." : "Entrar"}</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: background },
  body: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", height: 48 },
  back: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  ring: {
    width: 26,
    height: 26,
    marginLeft: 6,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#d5d5d5",
  },
  intro: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, minWidth: 0 },
  mascot: { width: 84, height: 84 },
  mascotBody: {
    position: "absolute",
    left: 8,
    top: 2,
    width: 68,
    height: 58,
    borderRadius: 30,
    backgroundColor: "#2f9bff",
  },
  mascotEar: {
    position: "absolute",
    left: 2,
    top: 26,
    width: 16,
    height: 20,
    borderRadius: 8,
    backgroundColor: "#2f9bff",
  },
  eye: {
    position: "absolute",
    top: 20,
    width: 18,
    height: 20,
    borderRadius: 9,
    backgroundColor: "#f4f7fb",
  },
  pupil: {
    position: "absolute",
    top: 26,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1a1c1e",
  },
  laptop: {
    position: "absolute",
    left: 26,
    top: 50,
    width: 48,
    height: 22,
    borderRadius: 4,
    backgroundColor: "#e8eef5",
  },
  laptopBase: {
    position: "absolute",
    left: 18,
    top: 70,
    width: 62,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#c5d4e4",
  },
  bubble: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    borderWidth: 1.5,
    borderColor: line,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bubbleText: {
    color: "#ffffff",
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  bubbleAccent: { color: orange },
  footer: { flexGrow: 1, justifyContent: "flex-end", paddingTop: 28, paddingBottom: 8 },
  hero: {
    color: "#ffffff",
    fontFamily: "Nunito_700Bold",
    fontSize: 36,
    textAlign: "center",
  },
  heroSub: {
    marginTop: 4,
    marginBottom: 28,
    color: "#ffffff",
    fontFamily: "Nunito_700Bold",
    fontSize: 22,
    textAlign: "center",
  },
  appleButton: {
    height: 56,
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  appleLabel: { color: "#111111", fontFamily: "Nunito_700Bold", fontSize: 16 },
  legal: {
    marginTop: 18,
    color: muted,
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  legalLink: { color: "#cfcfcf", textDecorationLine: "underline" },
  laterHit: { marginTop: 18, alignItems: "center" },
  later: { color: "#b5b5b5", fontFamily: "Nunito_700Bold", fontSize: 16 },
  laterNote: {
    marginTop: 8,
    color: muted,
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    textAlign: "center",
  },
  input: {
    height: 52,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: line,
    backgroundColor: "#1e1e1e",
    paddingHorizontal: 16,
    color: "#ffffff",
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
  },
  error: {
    marginBottom: 12,
    color: "#ff6b6b",
    fontFamily: "Nunito_500Medium",
    fontSize: 14,
    textAlign: "center",
  },
});
