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
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "./theme";

export function AuthMascot() {
  const styles = useAuthStyles();
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

export function AuthBubble({ children }: { children: ReactNode }) {
  const styles = useAuthStyles();
  return <View style={styles.bubble}>{children}</View>;
}

export function AuthShell({
  onBack,
  showBack = true,
  bubble,
  children,
}: {
  onBack?: () => void;
  showBack?: boolean;
  bubble: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  const styles = useAuthStyles();

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="Voltar"
              disabled={!showBack}
              onPress={onBack}
              hitSlop={8}
              style={[styles.back, !showBack && { opacity: 0 }]}
            >
              <Ionicons name="chevron-back" size={28} color={theme.shell.foreground} />
            </Pressable>
            <View style={styles.ring} />
          </View>

          <View style={styles.intro}>
            <AuthMascot />
            <AuthBubble>{bubble}</AuthBubble>
          </View>

          <View style={styles.footer}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function useAuthStyles() {
  const theme = useTheme();
  const { shell, fonts } = theme;
  return useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: shell.background },
        center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: shell.background },
        body: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 12 },
        header: { flexDirection: "row", alignItems: "center", height: 48 },
        back: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
        ring: {
          width: 26,
          height: 26,
          marginLeft: 6,
          borderRadius: 13,
          borderWidth: 2,
          borderColor: shell.mascot.ring,
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
          backgroundColor: shell.mascot.body,
        },
        mascotEar: {
          position: "absolute",
          left: 2,
          top: 26,
          width: 16,
          height: 20,
          borderRadius: 8,
          backgroundColor: shell.mascot.body,
        },
        eye: {
          position: "absolute",
          top: 20,
          width: 18,
          height: 20,
          borderRadius: 9,
          backgroundColor: shell.mascot.eye,
        },
        pupil: {
          position: "absolute",
          top: 26,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: shell.mascot.pupil,
        },
        laptop: {
          position: "absolute",
          left: 26,
          top: 50,
          width: 48,
          height: 22,
          borderRadius: 4,
          backgroundColor: shell.mascot.laptop,
        },
        laptopBase: {
          position: "absolute",
          left: 18,
          top: 70,
          width: 62,
          height: 6,
          borderRadius: 3,
          backgroundColor: shell.mascot.laptopBase,
        },
        bubble: {
          flex: 1,
          flexShrink: 1,
          minWidth: 0,
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
        bubbleAccent: { color: shell.mascot.accent },
        footer: { flexGrow: 1, justifyContent: "flex-end", paddingTop: 28, paddingBottom: 8 },
        hero: {
          color: shell.foreground,
          fontFamily: fonts.bold,
          fontSize: 36,
          textAlign: "center",
        },
        heroSub: {
          marginTop: 4,
          marginBottom: 28,
          color: shell.foreground,
          fontFamily: fonts.bold,
          fontSize: 22,
          textAlign: "center",
        },
        primaryButton: {
          height: 56,
          marginTop: 12,
          borderRadius: 16,
          backgroundColor: shell.chipActive,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        },
        primaryLabel: { color: shell.chipActiveText, fontFamily: fonts.bold, fontSize: 16 },
        secondaryButton: {
          height: 56,
          marginTop: 12,
          borderRadius: 16,
          backgroundColor: shell.chip,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        },
        secondaryLabel: { color: shell.chipText, fontFamily: fonts.bold, fontSize: 16 },
        legal: {
          marginTop: 18,
          color: shell.muted,
          fontFamily: fonts.regular,
          fontSize: 12,
          lineHeight: 18,
          textAlign: "center",
        },
        legalLink: { color: shell.foreground, textDecorationLine: "underline" },
        laterHit: { marginTop: 18, alignItems: "center" },
        later: { color: shell.muted, fontFamily: fonts.bold, fontSize: 16 },
        laterNote: {
          marginTop: 8,
          color: shell.muted,
          fontFamily: fonts.regular,
          fontSize: 13,
          textAlign: "center",
        },
        input: {
          height: 52,
          marginBottom: 12,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: shell.line,
          backgroundColor: shell.surface,
          paddingHorizontal: 16,
          color: shell.foreground,
          fontFamily: fonts.regular,
          fontSize: 16,
        },
        error: {
          marginBottom: 12,
          color: shell.dangerOnDark,
          fontFamily: fonts.medium,
          fontSize: 14,
          textAlign: "center",
        },
        switchHit: { marginTop: 18, alignItems: "center" },
        switchText: { color: shell.muted, fontFamily: fonts.medium, fontSize: 15, textAlign: "center" },
        switchLink: { color: shell.foreground, fontFamily: fonts.bold },
      }),
    [fonts, shell]
  );
}
