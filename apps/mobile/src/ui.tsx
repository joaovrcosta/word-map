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
import { usePathname } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { tabBarContentInset, tabBarHidden, type ToneName, useTheme } from "./theme";

export function useTabBarInset() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  if (tabBarHidden(pathname)) return 0;
  return tabBarContentInset(insets.bottom);
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  safeBottom = false,
  reserveTabBar = true,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  safeBottom?: boolean;
  reserveTabBar?: boolean;
}) {
  const theme = useTheme();
  const tabInset = useTabBarInset();
  const bottomPad = safeBottom || !reserveTabBar ? 0 : tabInset;
  return (
    <SafeAreaView
      edges={safeBottom ? ["top", "right", "bottom", "left"] : ["top", "left", "right"]}
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            padded ? styles.scroll : styles.scrollFlush,
            bottomPad > 0 ? { paddingBottom: (padded ? 32 : 0) + bottomPad } : null,
          ]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[padded ? styles.body : styles.bodyFlush, bottomPad > 0 ? { paddingBottom: (padded ? 20 : 0) + bottomPad } : null]}>
          {children}
        </View>
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

export function Muted({ children, onPastel = false }: { children: string; onPastel?: boolean }) {
  const theme = useTheme();
  return (
    <Text
      style={[
        styles.muted,
        {
          color: onPastel ? theme.shell.onPastelMuted : theme.colors.mutedForeground,
          fontFamily: theme.fonts.regular,
        },
      ]}
    >
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
      <Text style={[styles.primaryLabel, { color: theme.shell.foreground, fontFamily: theme.fonts.bold }]}>{label}</Text>
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
          borderColor: theme.shell.line,
          backgroundColor: theme.shell.surface,
          fontFamily: theme.fonts.regular,
          borderRadius: theme.radii.md,
        },
        props.style,
      ]}
    />
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: selected ? theme.shell.chipActive : theme.shell.chip,
      }}
    >
      <Text
        style={{
          color: selected ? theme.shell.chipActiveText : theme.shell.chipText,
          fontFamily: theme.fonts.medium,
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({
  children,
  onPress,
  tone,
  stripe = false,
}: {
  children: ReactNode;
  onPress?: () => void;
  tone?: ToneName;
  stripe?: boolean;
}) {
  const theme = useTheme();
  const pastel = tone ? theme.shell.tones[tone] : null;
  const full = Boolean(pastel && !stripe);
  const style = [
    styles.card,
    {
      backgroundColor: full && pastel ? pastel : theme.shell.surface,
      borderColor: full ? "transparent" : theme.shell.line,
      borderWidth: full ? 0 : 1,
      borderRadius: pastel ? 20 : theme.radii.lg,
    },
  ];
  const body = (
    <>
      {stripe && pastel ? <View style={{ width: 8, backgroundColor: pastel }} /> : null}
      <View style={styles.cardBody}>{children}</View>
    </>
  );
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable onPress={onPress} style={style}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, padding: 20 },
  bodyFlush: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 32 },
  scrollFlush: { flexGrow: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 28 },
  muted: { marginTop: 6, fontSize: 15, lineHeight: 22 },
  error: { marginTop: 12, fontSize: 14 },
  primary: { alignItems: "center", paddingVertical: 14, marginTop: 12 },
  primaryLabel: { fontSize: 16 },
  field: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginTop: 12 },
  card: { marginTop: 12, overflow: "hidden", flexDirection: "row" },
  cardBody: { flex: 1, padding: 16 },
});
