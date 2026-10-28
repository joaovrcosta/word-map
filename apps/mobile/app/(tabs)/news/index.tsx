import { useCallback, useState } from "react";
import { type Href, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";
import { formatNewsDate } from "../../../src/features/news/format";
import type { NewsListItem } from "../../../src/features/news/types";
import { useSession } from "../../../src/session";
import { useTheme } from "../../../src/theme";
import { ErrorText, Loading, Muted, Screen } from "../../../src/ui";

function formatListen(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")} min`;
}

export default function NewsScreen() {
  const theme = useTheme();
  const { request } = useSession();
  const [articles, setArticles] = useState<NewsListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await request<NewsListItem[]>("/news");
      setArticles(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar as notícias");
      setArticles((current) => current ?? []);
    }
  }, [request]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <Screen scroll>
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        style={{ alignSelf: "flex-start", marginBottom: 12 }}
      >
        <Ionicons name="chevron-back" size={28} color={theme.shell.foreground} />
      </Pressable>
      <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 28 }}>
        Notícias
      </Text>
      <Muted>Leituras curtas publicadas pelo Hub, em formato editorial.</Muted>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {!articles ? (
        <Loading />
      ) : articles.length === 0 ? (
        <View style={{ marginTop: 28 }}>
          <Muted>Nenhuma notícia publicada ainda.</Muted>
        </View>
      ) : (
        <View style={{ marginTop: 18, gap: 18 }}>
          {articles.map((article) => (
            <Pressable
              key={article.id}
              accessibilityRole="button"
              onPress={() => router.push(`/news/${article.id}` as Href)}
              style={{ gap: 12 }}
            >
              {article.imageUrl ? (
                <Image
                  source={{ uri: article.imageUrl }}
                  style={{ width: "100%", height: 180, borderRadius: 4 }}
                  resizeMode="cover"
                />
              ) : null}
              <Text
                style={{
                  color: theme.shell.muted,
                  fontFamily: theme.fonts.semibold,
                  fontSize: 12,
                  letterSpacing: 0.3,
                }}
              >
                {article.section}
                {formatNewsDate(article.publishedAt)
                  ? ` · ${formatNewsDate(article.publishedAt)}`
                  : ""}
              </Text>
              <Text
                style={{
                  color: theme.shell.foreground,
                  fontFamily: theme.fonts.serifItalic,
                  fontSize: 24,
                  lineHeight: 30,
                }}
              >
                {article.title}
              </Text>
              <Text
                numberOfLines={3}
                style={{
                  color: theme.shell.muted,
                  fontFamily: theme.fonts.serif,
                  fontSize: 15,
                  lineHeight: 22,
                }}
              >
                {article.summary}
              </Text>
              <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 12 }}>
                Ouvir · {formatListen(article.listenSeconds)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
