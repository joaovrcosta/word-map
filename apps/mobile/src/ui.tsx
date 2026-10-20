import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "./theme";

export function Screen({
  children,
  scroll = false,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll}>{children}</ScrollView>
      ) : (
        <View style={styles.body}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Loading() {
  const theme = useTheme();
  return (
    <Screen>
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.green} />
      </View>
    </Screen>
  );
}

export function Heading({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text style={[styles.heading, { color: theme.colors.foreground, fontFamily: theme.fonts.bold }]}>
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text style={[styles.muted, { color: theme.colors.mutedForeground, fontFamily: theme.fonts.regular }]}>
      {children}
    </Text>
  );
}

export function ErrorText({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text style={[styles.error, { color: theme.colors.destructive, fontFamily: theme.fonts.medium }]}>
      {children}
    </Text>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.primary,
        { backgroundColor: theme.colors.green, borderRadius: theme.radii.lg, opacity: disabled ? 0.6 : 1 },
      ]}
    >
      <Text style={[styles.primaryLabel, { fontFamily: theme.fonts.bold }]}>{label}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.colors.mutedForeground}
      {...props}
      style={[
        styles.field,
        {
          color: theme.colors.foreground,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.background,
          fontFamily: theme.fonts.regular,
          borderRadius: theme.radii.md,
        },
        props.style,
      ]}
    />
  );
}

export function Card({
  children,
  onPress,
}: {
  children: ReactNode;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const style = [
    styles.card,
    {
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
    },
  ];
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={style}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, padding: 20 },
  scroll: { padding: 20, paddingBottom: 32 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 28 },
  muted: { marginTop: 6, fontSize: 15, lineHeight: 22 },
  error: { marginTop: 12, fontSize: 14 },
  primary: { alignItems: "center", paddingVertical: 14, marginTop: 12 },
  primaryLabel: { color: "#ffffff", fontSize: 16 },
  field: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginTop: 12 },
  card: { borderWidth: 1, padding: 16, marginTop: 12 },
});
