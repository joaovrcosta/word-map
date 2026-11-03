import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useTheme } from "./theme";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

WebBrowser.maybeCompleteAuthSession();

const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";

type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
      }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

function googleError(response: { error?: { message?: string } | null; params?: Record<string, string> }) {
  return (
    response.params?.error_description ||
    response.error?.message ||
    "Não foi possível entrar com o Google"
  );
}

export function GoogleContinueButton({
  disabled,
  onCredential,
  onError,
  lastUsed = false,
  variant = "light",
}: {
  disabled?: boolean;
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
  lastUsed?: boolean;
  variant?: "light" | "dark";
}) {
  const theme = useTheme();
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  onCredentialRef.current = onCredential;
  onErrorRef.current = onError;
  const handled = useRef<string | null>(null);
  const [webWidth, setWebWidth] = useState(0);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId,
    webClientId: clientId,
    iosClientId: clientId,
    androidClientId: androidClientId || clientId,
    selectAccount: true,
    language: "pt-BR",
  });

  useEffect(() => {
    if (!response || Platform.OS === "web") return;
    if (response.type === "error") {
      onErrorRef.current(googleError(response));
      return;
    }
    if (response.type !== "success") return;
    const token = response.params.id_token;
    if (!token) {
      onErrorRef.current("Não foi possível entrar com o Google");
      return;
    }
    if (handled.current === token) return;
    handled.current = token;
    onCredentialRef.current(token);
  }, [response]);

  useEffect(() => {
    if (Platform.OS !== "web" || !clientId || webWidth <= 0) return;
    const parent = document.getElementById("google-signin-host");
    if (!parent) return;
    let cancelled = false;

    const render = () => {
      const google = window.google;
      if (cancelled || !google || !parent.isConnected) return;
      parent.replaceChildren();
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (result) => {
          if (result.credential) onCredentialRef.current(result.credential);
          else onErrorRef.current("Não foi possível entrar com o Google");
        },
      });
      google.accounts.id.renderButton(parent, {
        theme: "outline",
        size: "large",
        width: webWidth,
        text: "continue_with",
        shape: "rectangular",
      });
    };

    if (window.google) {
      render();
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client?hl=pt-BR";
    script.async = true;
    script.onload = render;
    script.onerror = () => onErrorRef.current("Não foi possível carregar o Google");
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [webWidth]);

  const startNative = () => {
    if (!clientId || (Platform.OS === "android" && !androidClientId)) {
      onError("Login com Google não está configurado.");
      return;
    }
    void promptAsync();
  };

  const light = variant === "light";
  const label = lastUsed ? "Continuar com Google (último usado)" : "Continuar com Google";

  return (
    <View style={{ position: "relative" }}>
      <Pressable
        disabled={disabled || (Platform.OS !== "web" && !request)}
        onPress={Platform.OS === "web" ? undefined : startNative}
        style={[
          styles.button,
          light
            ? { backgroundColor: "#E8E8E8" }
            : { backgroundColor: theme.shell.tabBar, borderWidth: 1.5, borderColor: theme.shell.line },
        ]}
      >
        <Ionicons name="logo-google" size={18} color={light ? "#111111" : theme.shell.foreground} />
        <Text
          style={[
            styles.label,
            {
              color: light ? "#111111" : theme.shell.foreground,
              fontFamily: theme.fonts.bold,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
      {Platform.OS === "web" ? (
        <View
          nativeID="google-signin-host"
          onLayout={(event) => setWebWidth(Math.floor(event.nativeEvent.layout.width))}
          style={styles.webHit}
        />
      ) : null}
    </View>
  );
}

const styles = {
  button: {
    height: 54,
    borderRadius: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingHorizontal: 16,
  },
  label: { fontSize: 16 },
  webHit: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.01,
    overflow: "hidden" as const,
  },
};
