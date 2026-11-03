import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { type Href, Redirect, router } from "expo-router";
import { getSharedPayloads } from "expo-sharing";
import { AuthShell, BrandMark, useAuthStyles } from "../src/auth-shell";
import { GoogleContinueButton } from "../src/google-continue";
import { useSession } from "../src/session";
import { useTheme } from "../src/theme";

const LAST_AUTH_KEY = "word-map.last-auth-method";
type AuthMethod = "google" | "apple" | "email";
type Mode = "welcome" | "signin" | "email" | "username";

export default function LoginScreen() {
  const theme = useTheme();
  const styles = useAuthStyles();
  const { ready, user, signIn, signInWithGoogle } = useSession();
  const [mode, setMode] = useState<Mode>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);
  const [lastMethod, setLastMethod] = useState<AuthMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void AsyncStorage.getItem(LAST_AUTH_KEY).then((value) => {
      if (value === "google" || value === "apple" || value === "email") {
        setLastMethod(value);
      }
    });
  }, []);

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

  const remember = (method: AuthMethod) => {
    setLastMethod(method);
    void AsyncStorage.setItem(LAST_AUTH_KEY, method);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const message = await signIn(email.trim(), password);
      if (message) setError(message);
      else remember("email");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar");
    } finally {
      setSubmitting(false);
    }
  };

  const acceptGoogle = async (credential: string, chosen?: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await signInWithGoogle(credential, chosen);
      if (result && "needsUsername" in result) {
        const suggestion = result.email
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 20);
        setGoogleCredential(credential);
        setUsername(suggestion);
        setMode("username");
        return;
      }
      if (result?.error) setError(result.error);
      else remember("google");
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

  const goWelcome = () => {
    setError(null);
    setGoogleCredential(null);
    setMode("welcome");
  };

  const goSignin = () => {
    setError(null);
    setMode("signin");
  };

  if (mode === "welcome") {
    return (
      <AuthShell showBack={false} mosaic>
        <View style={styles.welcomeBlock}>
          <View style={styles.brandRow}>
            <BrandMark />
            <Text style={styles.brandTitle}>
              <Text style={styles.brandWord}>Word</Text>
              <Text style={styles.brandMap}> Map</Text>
            </Text>
            <Text style={styles.brandTag}>Lembre palavras</Text>
          </View>
          <View style={styles.welcomeActions}>
            <Pressable
              onPress={() => router.push("/register" as Href)}
              style={styles.lightButton}
            >
              <Text style={styles.lightLabel}>Começar</Text>
            </Pressable>
            <Pressable onPress={goSignin} style={styles.darkButton}>
              <Text style={styles.darkLabel}>Entrar</Text>
            </Pressable>
          </View>
        </View>
      </AuthShell>
    );
  }

  if (mode === "username") {
    return (
      <AuthShell
        showBack
        onBack={() => {
          setError(null);
          setGoogleCredential(null);
          setMode("signin");
        }}
      >
        <Text style={styles.title}>Escolha seu @</Text>
        <Text style={styles.subtitle}>Esse nome aparece no ranking.</Text>
        <TextInput
          autoCapitalize="none"
          autoFocus
          maxLength={20}
          placeholder="seuusuario"
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={username}
          onChangeText={(value) => setUsername(value.replace(/^@+/, "").replace(/\s/g, ""))}
          style={styles.underlineInput}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={submitting} onPress={submitUsername} style={styles.lightButton}>
          <Text style={styles.lightLabel}>{submitting ? "Salvando..." : "Concluir"}</Text>
        </Pressable>
      </AuthShell>
    );
  }

  return (
    <AuthShell showBack onBack={mode === "email" ? () => setMode("signin") : goWelcome}>
      <Text style={styles.title}>Bem-vindo de volta 👋</Text>
      <Text style={styles.subtitle}>Entre na sua conta.</Text>

      <View style={styles.methods}>
        <GoogleContinueButton
          disabled={submitting}
          lastUsed={lastMethod === "google"}
          variant="light"
          onCredential={(credential) => void acceptGoogle(credential)}
          onError={setError}
        />
        <Pressable
          disabled={submitting}
          onPress={() =>
            Alert.alert("Apple", "Login com Apple ainda não está disponível neste app.")
          }
          style={styles.lightButton}
        >
          <Ionicons name="logo-apple" size={20} color="#111" />
          <Text style={styles.lightLabel}>Continuar com Apple</Text>
        </Pressable>
        {mode === "signin" ? (
          <Pressable
            disabled={submitting}
            onPress={() => {
              setError(null);
              setMode("email");
            }}
            style={styles.darkButton}
          >
            <Text style={styles.darkLabel}>Continuar com email</Text>
          </Pressable>
        ) : null}
      </View>

      {mode === "email" ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Entre com seu email.</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoFocus
            keyboardType="email-address"
            placeholder="Seu email"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={email}
            onChangeText={setEmail}
            style={styles.underlineInput}
          />
          <TextInput
            secureTextEntry
            placeholder="Sua senha"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={password}
            onChangeText={setPassword}
            style={styles.underlineInput}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            disabled={submitting}
            onPress={() => void submit()}
            style={[styles.darkButton, { marginTop: 16 }]}
          >
            <Text style={styles.darkLabel}>{submitting ? "Entrando..." : "Entrar"}</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(
                "Esqueceu a senha?",
                "Use a recuperação de senha em word-map.onrender.com/reset-password no navegador."
              )
            }
          >
            <Text style={styles.forgot}>Esqueceu a senha?</Text>
          </Pressable>
        </>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </AuthShell>
  );
}
