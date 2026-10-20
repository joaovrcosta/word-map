import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "../../src/session";
import { useTheme } from "../../src/theme";

export default function TabsLayout() {
  const theme = useTheme();
  const { ready, user } = useSession();

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
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fonts.semibold,
          fontSize: 13,
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Início", tabBarIcon: () => null }} />
      <Tabs.Screen name="vaults" options={{ title: "Vaults", tabBarIcon: () => null }} />
      <Tabs.Screen name="books" options={{ title: "Livros", tabBarIcon: () => null }} />
    </Tabs>
  );
}
