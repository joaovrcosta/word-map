import { useMemo, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "./theme";

const BRAND_GREEN = "#24c875";
const BRAND_BLUE = "#4B7BFF";

const MOSAIC_WORDS = [
  { word: "NASCENT", tone: "#2A4A3A" },
  { word: "INSIDIOUS", tone: "#3A2A4A" },
  { word: "TURGID", tone: "#4A3A2A" },
  { word: "AMORPHOUS", tone: "#2A3A4A" },
  { word: "LUCID", tone: "#3A4A2A" },
  { word: "EPHEMERAL", tone: "#4A2A3A" },
  { word: "SERENE", tone: "#2A4540" },
  { word: "VIVID", tone: "#453A2A" },
  { word: "MAP", tone: "#2A3545" },
];

export function BrandMark({ size = 72 }: { size?: number }) {
  const back = size * 0.78;
  const front = size * 0.78;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          left: 0,
          top: size * 0.08,
          width: back,
          height: back,
          borderRadius: 14,
          backgroundColor: BRAND_BLUE,
          transform: [{ rotate: "-8deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 0,
          bottom: size * 0.02,
          width: front,
          height: front,
          borderRadius: 14,
          backgroundColor: BRAND_GREEN,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ rotate: "6deg" }],
        }}
      >
        <Ionicons name="checkmark" size={Math.round(size * 0.42)} color="#111" />
      </View>
    </View>
  );
}

export function WelcomeMosaic() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={mosaic.grid}>
        {MOSAIC_WORDS.map((item) => (
          <View key={item.word} style={[mosaic.card, { backgroundColor: item.tone }]}>
            <View style={mosaic.art} />
            <Text style={mosaic.word}>{item.word}</Text>
          </View>
        ))}
      </View>
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)", "#000000"]}
        locations={[0, 0.45, 0.78]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const mosaic = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 56,
    opacity: 0.9,
    transform: [{ rotate: "-2deg" }, { scale: 1.08 }],
  },
  card: {
    width: "30%",
    aspectRatio: 0.78,
    borderRadius: 14,
    padding: 8,
    justifyContent: "flex-end",
  },
  art: {
    ...StyleSheet.absoluteFillObject,
    margin: 8,
    marginBottom: 28,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  word: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
});

export function AuthShell({
  onBack,
  showBack = true,
  mosaic = false,
  children,
}: {
  onBack?: () => void;
  showBack?: boolean;
  mosaic?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  const styles = useAuthStyles();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {mosaic ? <WelcomeMosaic /> : null}
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.safe}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {showBack ? (
              <Pressable
                accessibilityLabel="Voltar"
                onPress={onBack}
                hitSlop={8}
                style={styles.back}
              >
                <Ionicons name="chevron-back" size={28} color={theme.shell.foreground} />
              </Pressable>
            ) : (
              <View style={styles.backSpacer} />
            )}
            <View style={styles.content}>{children}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** @deprecated mascote do fluxo antigo — mantido só se alguma tela ainda importar */
export function AuthMascot() {
  return null;
}

export function AuthBubble({ children }: { children: ReactNode }) {
  const styles = useAuthStyles();
  return <View style={styles.legacyBubble}>{children}</View>;
}

export function useAuthStyles() {
  const theme = useTheme();
  const { shell, fonts } = theme;
  return useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: "#000000" },
        safe: { flex: 1 },
        center: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
        },
        body: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 28 },
        back: {
          width: 40,
          height: 40,
          marginTop: 4,
          alignItems: "flex-start",
          justifyContent: "center",
        },
        backSpacer: { height: 40, marginTop: 4 },
        content: { flexGrow: 1 },
        welcomeBlock: {
          flexGrow: 1,
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 8,
        },
        brandRow: { alignItems: "center", marginBottom: 28 },
        brandTitle: {
          marginTop: 18,
          fontFamily: fonts.bold,
          fontSize: 34,
          letterSpacing: -0.5,
        },
        brandWord: { color: BRAND_GREEN },
        brandMap: { color: "#FFFFFF" },
        brandTag: {
          marginTop: 6,
          color: "rgba(255,255,255,0.88)",
          fontFamily: fonts.medium,
          fontSize: 16,
        },
        welcomeActions: { width: "100%", marginTop: 12 },
        lightButton: {
          height: 54,
          borderRadius: 14,
          backgroundColor: "#E8E8E8",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 10,
          paddingHorizontal: 16,
        },
        lightLabel: { color: "#111111", fontFamily: fonts.bold, fontSize: 16 },
        darkButton: {
          height: 54,
          marginTop: 12,
          borderRadius: 14,
          backgroundColor: "#161616",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 10,
          paddingHorizontal: 16,
        },
        darkLabel: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 16 },
        title: {
          marginTop: 18,
          color: "#FFFFFF",
          fontFamily: fonts.bold,
          fontSize: 32,
          letterSpacing: -0.4,
        },
        subtitle: {
          marginTop: 8,
          marginBottom: 28,
          color: "rgba(255,255,255,0.55)",
          fontFamily: fonts.medium,
          fontSize: 16,
        },
        methods: { gap: 12 },
        sectionLabel: {
          marginTop: 22,
          marginBottom: 14,
          color: "rgba(255,255,255,0.5)",
          fontFamily: fonts.medium,
          fontSize: 14,
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: "rgba(255,255,255,0.14)",
          marginTop: 22,
        },
        underlineInput: {
          height: 48,
          marginBottom: 8,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: "rgba(255,255,255,0.28)",
          color: "#FFFFFF",
          fontFamily: fonts.regular,
          fontSize: 16,
          paddingHorizontal: 0,
        },
        forgot: {
          marginTop: 18,
          color: "rgba(255,255,255,0.72)",
          fontFamily: fonts.medium,
          fontSize: 15,
          textDecorationLine: "underline",
          textAlign: "center",
        },
        error: {
          marginTop: 12,
          marginBottom: 4,
          color: shell.dangerOnDark,
          fontFamily: fonts.medium,
          fontSize: 14,
          textAlign: "center",
        },
        // legado (register ainda usa alguns nomes)
        hero: {
          color: "#FFFFFF",
          fontFamily: fonts.bold,
          fontSize: 32,
        },
        heroSub: {
          marginTop: 8,
          marginBottom: 24,
          color: "rgba(255,255,255,0.55)",
          fontFamily: fonts.medium,
          fontSize: 16,
        },
        primaryButton: {
          height: 54,
          marginTop: 12,
          borderRadius: 14,
          backgroundColor: "#E8E8E8",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        },
        primaryLabel: { color: "#111111", fontFamily: fonts.bold, fontSize: 16 },
        secondaryButton: {
          height: 54,
          marginTop: 12,
          borderRadius: 14,
          backgroundColor: "#161616",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        },
        secondaryLabel: { color: "#FFFFFF", fontFamily: fonts.bold, fontSize: 16 },
        input: {
          height: 48,
          marginBottom: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: "rgba(255,255,255,0.28)",
          color: "#FFFFFF",
          fontFamily: fonts.regular,
          fontSize: 16,
          paddingHorizontal: 0,
        },
        legal: {
          marginTop: 18,
          color: "rgba(255,255,255,0.45)",
          fontFamily: fonts.regular,
          fontSize: 12,
          lineHeight: 18,
          textAlign: "center",
        },
        legalLink: { color: "#FFFFFF", textDecorationLine: "underline" },
        switchHit: { marginTop: 18, alignItems: "center" },
        switchText: {
          color: "rgba(255,255,255,0.55)",
          fontFamily: fonts.medium,
          fontSize: 15,
          textAlign: "center",
        },
        switchLink: { color: "#FFFFFF", fontFamily: fonts.bold },
        legacyBubble: {
          borderWidth: 1.5,
          borderColor: shell.line,
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 12,
        },
        bubbleText: {
          color: shell.foreground,
          fontFamily: fonts.bold,
          fontSize: 16,
          lineHeight: 22,
        },
        bubbleAccent: { color: BRAND_GREEN },
        laterHit: { marginTop: 18, alignItems: "center" },
        later: { color: shell.muted, fontFamily: fonts.bold, fontSize: 16 },
        laterNote: {
          marginTop: 8,
          color: shell.muted,
          fontFamily: fonts.regular,
          fontSize: 13,
          textAlign: "center",
        },
      }),
    [fonts, shell]
  );
}
