import { Redirect, Tabs, usePathname } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "../../src/session";
import { useTheme } from "../../src/theme";

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, user } = useSession();
  const bottomInset = insets.bottom;
  const pathname = usePathname();
  const hideTabBar = /^\/books\/[^/]+\/chapters\/[^/]+/.test(pathname) || /^\/flashcards\/[^/]+/.test(pathname);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.green} />
      </View>
    );
  }

  if (!user) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.green,
        tabBarInactiveTintColor: theme.colors.mutedForeground,
        tabBarStyle: hideTabBar
          ? { display: "none", height: 0 }
          : {
              backgroundColor: theme.colors.card,
              borderTopColor: theme.colors.border,
              borderTopWidth: 1,
              height: 48 + bottomInset,
              paddingTop: 0,
              paddingBottom: bottomInset,
            },
        tabBarLabelPosition: "beside-icon",
        tabBarIconStyle: { display: "none", width: 0, height: 0 },
        tabBarItemStyle: {
          justifyContent: "center",
          paddingVertical: 0,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fonts.semibold,
          fontSize: 12,
          marginTop: 0,
          marginBottom: 0,
          marginStart: 0,
          marginEnd: 0,
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Início", tabBarIcon: () => null }} />
      <Tabs.Screen name="vaults" options={{ title: "Vaults", tabBarIcon: () => null }} />
      <Tabs.Screen name="flashcards" options={{ title: "Flashcards", tabBarIcon: () => null }} />
      <Tabs.Screen name="books" options={{ title: "Biblioteca", tabBarIcon: () => null }} />
      <Tabs.Screen name="ranking" options={{ href: null }} />
    </Tabs>
  );
}
