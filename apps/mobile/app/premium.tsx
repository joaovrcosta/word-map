import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/theme";

const ACCENT = "#7B6CFF";
const GOLD = "#F5C518";

const FEATURES = [
  {
    icon: "book-outline" as const,
    text: "Livros e histórias reais — tudo no seu nível",
    bold: null,
  },
  {
    icon: "language-outline" as const,
    text: "Toque em qualquer palavra — ",
    bold: "tradução instantânea",
  },
  {
    icon: "headset-outline" as const,
    text: "Ouça e acompanhe com ",
    bold: "áudio sincronizado",
  },
  {
    icon: "layers-outline" as const,
    text: "",
    bold: "Flashcards",
    after: " que fazem as palavras fixarem",
  },
];

type Plan = "year" | "month";

export default function PremiumScreen() {
  const theme = useTheme();
  const [plan, setPlan] = useState<Plan>("year");
  const [trial, setTrial] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 4 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          hitSlop={12}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="close" size={28} color={theme.shell.foreground} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 120 }}>
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: GOLD,
            }}
          >
            <FontAwesome5 name="crown" size={34} color="#FFFFFF" solid />
          </View>
        </View>

        <Text
          style={{
            marginTop: 22,
            color: theme.shell.foreground,
            fontFamily: theme.fonts.bold,
            fontSize: 28,
            lineHeight: 34,
            textAlign: "center",
          }}
        >
          Aprenda{" "}
          <Text style={{ color: ACCENT }}>mais de 500</Text> palavras por mês com o Premium
        </Text>

        <View style={{ marginTop: 26, gap: 16 }}>
          {FEATURES.map((item) => (
            <View key={item.icon} style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
              <Ionicons name={item.icon} size={22} color={theme.shell.foreground} style={{ marginTop: 2 }} />
              <Text
                style={{
                  flex: 1,
                  color: theme.shell.foreground,
                  fontFamily: theme.fonts.medium,
                  fontSize: 16,
                  lineHeight: 22,
                }}
              >
                {item.text}
                {item.bold ? (
                  <Text style={{ fontFamily: theme.fonts.bold }}>{item.bold}</Text>
                ) : null}
                {item.after ?? null}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 28, gap: 12 }}>
          <Pressable
            onPress={() => setPlan("year")}
            style={{
              borderRadius: 16,
              borderWidth: 2,
              borderColor: plan === "year" ? ACCENT : theme.shell.line,
              backgroundColor: theme.shell.surface,
              padding: 16,
              position: "relative",
            }}
          >
            <View
              style={{
                position: "absolute",
                top: -12,
                right: 14,
                backgroundColor: ACCENT,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: "#fff", fontFamily: theme.fonts.bold, fontSize: 11 }}>55% de desconto</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Ionicons
                name={plan === "year" ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={plan === "year" ? ACCENT : theme.shell.muted}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 17 }}>
                  R$ 259,99 / Ano
                </Text>
                <Text style={{ marginTop: 2, color: ACCENT, fontFamily: theme.fonts.semibold, fontSize: 13 }}>
                  7 dias grátis
                </Text>
              </View>
              <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 13 }}>
                ~ R$ 21,67/mês
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setPlan("month")}
            style={{
              borderRadius: 16,
              borderWidth: 2,
              borderColor: plan === "month" ? ACCENT : theme.shell.line,
              backgroundColor: theme.shell.chip,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Ionicons
                name={plan === "month" ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={plan === "month" ? ACCENT : theme.shell.muted}
              />
              <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 17 }}>
                R$ 46,99 / Mês
              </Text>
            </View>
          </Pressable>
        </View>

        <View
          style={{
            marginTop: 18,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 16 }}>
            Teste grátis
          </Text>
          <Switch
            value={trial}
            onValueChange={setTrial}
            trackColor={{ false: theme.shell.line, true: "#34C759" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Text
          style={{
            marginTop: 22,
            color: theme.shell.foreground,
            fontFamily: theme.fonts.bold,
            fontSize: 20,
          }}
        >
          Tudo no Premium
        </Text>
        <View
          style={{
            marginTop: 12,
            borderRadius: 16,
            backgroundColor: theme.shell.surface,
            borderWidth: 1,
            borderColor: theme.shell.line,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Ionicons name="sparkles-outline" size={22} color={ACCENT} />
          <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.semibold, fontSize: 15 }}>
            Assistente de IA
          </Text>
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 22,
          paddingBottom: 24,
          paddingTop: 12,
          backgroundColor: theme.colors.background,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            height: 54,
            borderRadius: 16,
            backgroundColor: ACCENT,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontFamily: theme.fonts.bold, fontSize: 16 }}>
            {trial ? "Comece teste grátis de 7 dias  ›" : "Assinar Premium  ›"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
