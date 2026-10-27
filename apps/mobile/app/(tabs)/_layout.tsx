import { Redirect, Tabs, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSession } from "../../src/session";
import { tabBarBottom, tabBarHidden, tabBarMetrics, useTheme } from "../../src/theme";

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, user } = useSession();
  const pathname = usePathname();
  const hideTabBar = tabBarHidden(pathname);
  const bottom = tabBarBottom(insets.bottom);

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
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.shell.foreground,
        tabBarInactiveTintColor: theme.shell.muted,
        tabBarStyle: hideTabBar
          ? { display: "none", height: 0 }
          : {
              position: "absolute",
              start: tabBarMetrics.margin,
              end: tabBarMetrics.margin,
              bottom,
              height: tabBarMetrics.height,
              borderRadius: tabBarMetrics.height / 2,
              backgroundColor: theme.shell.tabBar,
              borderTopWidth: 0,
              paddingTop: 6,
              paddingBottom: 6,
              paddingHorizontal: 4,
              overflow: "hidden",
            },
        tabBarLabelPosition: "below-icon",
        tabBarItemStyle: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingVertical: 0,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fonts.medium,
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vaults"
        options={{
          title: "Vaults",
          tabBarIcon: ({ color, size }) => <Ionicons name="folder" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Busca",
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: focused ? theme.shell.tones.cream : theme.shell.tones.green,
              }}
            >
              <Ionicons name="search" size={16} color={theme.shell.onPastel} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="flashcards"
        options={{
          title: "Treino",
          tabBarIcon: ({ color, size }) => <Ionicons name="flash" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="books" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="ranking" options={{ href: null }} />
    </Tabs>
  );
}
