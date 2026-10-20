import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSession } from "../../../src/session";
import { useTheme } from "../../../src/theme";
import { type BookDetail } from "../../../src/types";
import { ErrorText, Heading, Loading, Muted, Screen } from "../../../src/ui";

export default function BookDetailScreen() {
  const theme = useTheme();
  const { request } = useSession();
  const params = useLocalSearchParams<{ id: string }>();
  const bookId = Number(params.id);
  const [book, setBook] = useState<BookDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const detail = await request<BookDetail | null>(`/books/${bookId}`);
      setBook(detail);
      setMissing(!detail);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o livro");
    }
  }, [bookId, request]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!book && !missing && !error) return <Loading />;

  const chapters = [...(book?.chapters ?? [])].sort((a, b) => a.order - b.order);

  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.semibold }}>Voltar</Text>
      </Pressable>
      <Heading>{book?.title ?? "Livro"}</Heading>
      {book?.description ? <Muted>{book.description}</Muted> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {missing ? <Muted>Adicione o livro à biblioteca para ler os capítulos.</Muted> : null}
      <ScrollView style={{ marginTop: 12, flex: 1 }}>
        {book && chapters.length === 0 ? <Muted>Este livro ainda não tem capítulos.</Muted> : null}
        {chapters.map((chapter, index) => (
          <Pressable
            key={chapter.id}
            onPress={() => router.push(`/books/${bookId}/chapters/${chapter.id}` as Href)}
            style={{
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.semibold, fontSize: 13 }}>
              {index + 1}
            </Text>
            <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 17, marginTop: 2 }}>
              {chapter.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
