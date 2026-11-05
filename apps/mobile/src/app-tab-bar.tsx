import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tabBarMetrics, useTheme } from "./theme";

type TabVisual = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  center?: boolean;
};

const TAB_VISUAL: Record<string, TabVisual> = {
  home: { label: "Review", icon: "copy-outline", iconFocused: "copy" },
  library: { label: "Explorar", icon: "compass-outline", iconFocused: "compass" },
  search: { label: "", icon: "search", iconFocused: "search", center: true },
  vaults: { label: "Vaults", icon: "albums-outline", iconFocused: "albums" },
  profile: { label: "Perfil", icon: "person-outline", iconFocused: "person" },
};

// Props vêm do tabBar do expo-router; tipagem frouxa evita atrito com NavigationHelpers.
export function AppTabBar({
  state,
  descriptors,
  navigation,
}: {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: object }>;
  };
  descriptors: Record<string, { options: { title?: string; href?: string | null } }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);
  // Só as 5 tabs principais — rotas com href:null (flashcards, books…)
  // ainda entram em state.routes e precisam ser ignoradas aqui.
  const visibleRoutes = state.routes.filter((route) => route.name in TAB_VISUAL);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          paddingBottom: bottomPad,
          backgroundColor: theme.shell.tabBar,
          borderTopColor: "rgba(255,255,255,0.06)",
        },
      ]}
    >
      <View style={styles.row}>
        {visibleRoutes.map((route) => {
          const routeIndex = state.routes.findIndex((item) => item.key === route.key);
          const focused = state.index === routeIndex;
          const visual = TAB_VISUAL[route.name] ?? {
            label: descriptors[route.key]?.options.title ?? route.name,
            icon: "ellipse-outline" as const,
            iconFocused: "ellipse" as const,
          };
          const color = focused ? theme.shell.foreground : theme.shell.muted;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          if (visual.center) {
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                onPress={onPress}
                onLongPress={onLongPress}
                style={styles.centerSlot}
              >
                <View style={styles.centerLift}>
                  <LinearGradient
                    colors={[
                      theme.shell.glow.purple,
                      theme.shell.glow.violet,
                      theme.shell.glow.indigo,
                      theme.shell.glow.blue,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.centerRing}
                  >
                    <View style={[styles.centerInner, { backgroundColor: theme.shell.background }]}>
                      <Ionicons name="search" size={22} color={theme.shell.foreground} />
                      <Ionicons
                        name="sparkles"
                        size={11}
                        color={theme.shell.glow.purple}
                        style={styles.sparkle}
                      />
                    </View>
                  </LinearGradient>
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={visual.label}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.item}
            >
              <Ionicons name={focused ? visual.iconFocused : visual.icon} size={22} color={color} />
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  {
                    color,
                    fontFamily: focused ? theme.fonts.semibold : theme.fonts.medium,
                  },
                ]}
              >
                {visual.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    height: tabBarMetrics.height,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingTop: 4,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.1,
    maxWidth: 64,
    textAlign: "center",
  },
  centerSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 2,
  },
  centerLift: {
    marginTop: -tabBarMetrics.centerLift,
  },
  centerRing: {
    width: tabBarMetrics.centerSize,
    height: tabBarMetrics.centerSize,
    borderRadius: tabBarMetrics.centerSize / 2,
    padding: 2.5,
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  centerInner: {
    flex: 1,
    borderRadius: tabBarMetrics.centerSize / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  sparkle: {
    position: "absolute",
    top: 10,
    right: 11,
  },
});
