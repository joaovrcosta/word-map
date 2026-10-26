import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { formatChapterContent } from "@word-map/shared";
import { useSession } from "../../../src/session";
import { useTheme } from "../../../src/theme";
import { type BookDetail, type ChapterDetail, type ChapterSummary } from "../../../src/types";
import { ErrorText, Field, Heading, Loading, Muted, PrimaryButton, Screen } from "../../../src/ui";

type ChapterDraft = {
  id: number | null;
  title: string;
  content: string;
};

export default function BookDetailScreen() {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const { request } = useSession();
  const params = useLocalSearchParams<{ id: string }>();
  const bookId = Number(params.id);
  const sheetMaxHeight = Math.round(windowHeight * 0.86);
  const contentMaxHeight = Math.max(140, Math.round(windowHeight * 0.34));
  const [book, setBook] = useState<BookDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ChapterDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingChapter, setLoadingChapter] = useState(false);

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

  const openCreate = () => {
    setError(null);
    setDraft({ id: null, title: "", content: "" });
  };

  const openEdit = async (chapterId: number) => {
    if (loadingChapter || saving) return;
    setLoadingChapter(true);
    setError(null);
    try {
      const detail = await request<ChapterDetail | null>(`/chapters/${chapterId}`);
      if (!detail) {
        setError("Capítulo não encontrado.");
        return;
      }
      setDraft({ id: detail.id, title: detail.title, content: detail.content });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o capítulo");
    } finally {
      setLoadingChapter(false);
    }
  };

  const closeDraft = () => {
    if (saving) return;
    setDraft(null);
  };

  const saveChapter = async () => {
    if (!draft) return;
    const title = draft.title.trim();
    const content = formatChapterContent(draft.content);
    if (!title || !content || saving) return;
    setDraft((current) => (current ? { ...current, title, content } : current));
    setSaving(true);
    setError(null);
    try {
      if (draft.id == null) {
        const created = await request<ChapterSummary>(`/books/${bookId}/chapters`, {
          method: "POST",
          body: JSON.stringify({ title, content }),
        });
        setDraft(null);
        await load();
        if (created?.id != null) {
          router.push(`/books/${bookId}/chapters/${created.id}` as Href);
        }
      } else {
        await request(`/chapters/${draft.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title, content }),
        });
        setDraft(null);
        await load();
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : draft.id == null
            ? "Não foi possível criar o capítulo"
            : "Não foi possível salvar o capítulo"
      );
    } finally {
      setSaving(false);
    }
  };

  if (!book && !missing && !error) return <Loading />;

  const chapters = [...(book?.chapters ?? [])].sort((a, b) => a.order - b.order);
  const editing = draft?.id != null;

  return (
    <Screen>
      <Pressable onPress={() => router.back()}>
        <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.semibold }}>Voltar</Text>
      </Pressable>
      <Heading>{book?.title ?? "Livro"}</Heading>
      {book?.description ? <Muted>{book.description}</Muted> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {missing ? <Muted>Adicione o livro à biblioteca para ler os capítulos.</Muted> : null}

      {book?.canEdit ? (
        <Pressable onPress={openCreate} style={{ marginTop: 12, alignSelf: "flex-start" }}>
          <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.bold, fontSize: 15 }}>
            + Adicionar capítulo
          </Text>
        </Pressable>
      ) : null}

      <ScrollView style={{ marginTop: 12, flex: 1 }}>
        {book && chapters.length === 0 ? (
          <View style={{ gap: 12, marginTop: 8 }}>
            <Muted>
              {book.canEdit
                ? "Este livro ainda não tem capítulos. Adicione o primeiro para começar a ler."
                : "Este livro ainda não tem capítulos."}
            </Muted>
            {book.canEdit ? <PrimaryButton label="Adicionar capítulo" onPress={openCreate} /> : null}
          </View>
        ) : null}
        {chapters.map((chapter, index) => (
          <View
            key={chapter.id}
            style={{
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Pressable
              onPress={() => router.push(`/books/${bookId}/chapters/${chapter.id}` as Href)}
              style={{ flex: 1, minWidth: 0 }}
            >
              <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.semibold, fontSize: 13 }}>
                {index + 1}
              </Text>
              <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 17, marginTop: 2 }}>
                {chapter.title}
              </Text>
            </Pressable>
            {book?.canEdit ? (
              <Pressable
                onPress={() => void openEdit(chapter.id)}
                disabled={loadingChapter || saving}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${chapter.title}`}
                style={{ opacity: loadingChapter ? 0.45 : 1, padding: 4 }}
              >
                <Ionicons name="create-outline" size={22} color={theme.colors.foreground} />
              </Pressable>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <Modal animationType="fade" transparent visible={draft != null} onRequestClose={closeDraft}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <Pressable style={{ flex: 1, justifyContent: "center", padding: 24 }} onPress={closeDraft}>
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={{
                backgroundColor: theme.shell.surface,
                borderRadius: theme.radii.lg,
                padding: 20,
                borderWidth: 1,
                borderColor: theme.shell.line,
                maxHeight: sheetMaxHeight,
                overflow: "hidden",
              }}
            >
              <Heading>{editing ? "Editar capítulo" : "Novo capítulo"}</Heading>
              <Field
                autoFocus
                value={draft?.title ?? ""}
                onChangeText={(title) => setDraft((current) => (current ? { ...current, title } : current))}
                placeholder="Título do capítulo"
                style={{ marginTop: 12 }}
              />
              <Field
                value={draft?.content ?? ""}
                onChangeText={(content) => setDraft((current) => (current ? { ...current, content } : current))}
                placeholder="Texto do capítulo"
                multiline
                scrollEnabled
                textAlignVertical="top"
                style={{
                  marginTop: 10,
                  height: contentMaxHeight,
                  maxHeight: contentMaxHeight,
                }}
              />
              <PrimaryButton
                label={saving ? "Salvando..." : editing ? "Salvar alterações" : "Salvar capítulo"}
                disabled={saving || !draft?.title.trim() || !draft?.content.trim()}
                onPress={() => void saveChapter()}
              />
              <Pressable onPress={closeDraft} style={{ alignItems: "center", marginTop: 14 }}>
                <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.semibold }}>
                  Cancelar
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
