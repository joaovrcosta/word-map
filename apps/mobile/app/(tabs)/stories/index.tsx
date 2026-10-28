import { useCallback, useState } from "react";
import { type Href, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useSession } from "../../../src/session";
import { useTheme } from "../../../src/theme";
import type { StoryListItem } from "../../../src/features/stories/types";
import { ErrorText, Loading, Muted, Screen } from "../../../src/ui";

export default function StoriesScreen() {
  const theme = useTheme();
  const { request } = useSession();
  const [stories, setStories] = useState<StoryListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await request<StoryListItem[]>("/stories");
      setStories(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar as histórias");
      setStories((current) => current ?? []);
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
      <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 28 }}>Histórias</Text>
      <Muted>Enredos curtos. Toque em Continuar e responda quando a história pedir.</Muted>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {!stories ? (
        <Loading />
      ) : stories.length === 0 ? (
        <View style={{ marginTop: 28 }}>
          <Muted>Nenhuma história publicada ainda.</Muted>
        </View>
      ) : (
        <View style={{ marginTop: 18, gap: 12 }}>
          {stories.map((story) => (
            <Pressable
              key={story.id}
              accessibilityRole="button"
              onPress={() => router.push(`/stories/${story.id}` as Href)}
              style={{
                borderRadius: 18,
                padding: 16,
                backgroundColor: theme.shell.surface,
                borderWidth: 1,
                borderColor: theme.shell.line,
              }}
            >
              <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 18 }}>
                {story.title}
              </Text>
              <Text style={{ marginTop: 4, color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 14 }}>
                {story.theme}
              </Text>
              <Text style={{ marginTop: 10, color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 12 }}>
                {story.stepCount} {story.stepCount === 1 ? "fala" : "falas"}
                {story.completion ? " · Concluída" : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
