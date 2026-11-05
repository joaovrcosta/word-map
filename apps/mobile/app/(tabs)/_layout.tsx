import { useState } from "react";
import { Redirect, Tabs, usePathname } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { AppTabBar } from "../../src/app-tab-bar";
import { AddWordSearchSheet } from "../../src/features/vaults/add-word-search-sheet";
import { useSession } from "../../src/session";
import { tabBarHidden, useTheme } from "../../src/theme";

export default function TabsLayout() {
  const theme = useTheme();
  const { ready, user } = useSession();
  const pathname = usePathname();
  const hideTabBar = tabBarHidden(pathname);
  const [searchOpen, setSearchOpen] = useState(false);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.green} />
      </View>
    );
  }

  if (!user) return <Redirect href="/" />;

  return (
    <>
      <Tabs
        tabBar={(props) => (hideTabBar ? null : <AppTabBar state={props.state} descriptors={props.descriptors} navigation={props.navigation} />)}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen name="home" options={{ title: "Review" }} />
        <Tabs.Screen name="library" options={{ title: "Explorar" }} />
        <Tabs.Screen
          name="search"
          listeners={{
            tabPress: (event) => {
              event.preventDefault();
              setSearchOpen(true);
            },
          }}
          options={{ title: "Busca" }}
        />
        <Tabs.Screen name="vaults" options={{ title: "Vaults" }} />
        <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
        <Tabs.Screen name="flashcards" options={{ href: null }} />
        <Tabs.Screen name="stories" options={{ href: null }} />
        <Tabs.Screen name="news" options={{ href: null }} />
        <Tabs.Screen name="books" options={{ href: null }} />
        <Tabs.Screen name="ranking" options={{ href: null }} />
      </Tabs>

      <AddWordSearchSheet visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
