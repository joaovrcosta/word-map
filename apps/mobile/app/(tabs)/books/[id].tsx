import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatChapterContent } from "@word-map/shared";
import { BookArt, bookAuthor } from "../../../src/features/books/cover";
import { readBookResume } from "../../../src/features/reading";
import { useSession } from "../../../src/session";
import { shell, tabBarContentInset, useTheme } from "../../../src/theme";
import { type BookDetail, type ChapterDetail, type ChapterSummary } from "../../../src/types";
import { ErrorText, Field, Heading, Loading, Muted, PrimaryButton } from "../../../src/ui";

function resumeChapter(chapters: ChapterSummary[], resumeId: number | null) {
  if (resumeId != null) {
    const fromLocal = chapters.find((chapter) => chapter.id === resumeId);
    if (fromLocal) return fromLocal;
  }
  let latest: ChapterSummary | null = null;
  let latestTs = 0;
  for (const chapter of chapters) {
    if (!chapter.progressUpdatedAt) continue;
    const ts = Date.parse(chapter.progressUpdatedAt);
    if (!Number.isFinite(ts) || ts <= latestTs) continue;
    latest = chapter;
    latestTs = ts;
  }
  if (latest) return latest;
  return (
    chapters.find((chapter) => !chapter.reachedEndAt) ?? chapters[0] ?? null
  );
}

type ChapterDraft = {
  id: number | null;
  title: string;
  content: string;
};

type DetailTab = "about" | "chapters" | "review";

const ACCENT = "#f08a24";

export default function BookDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
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
  const [busyLibrary, setBusyLibrary] = useState(false);
  const [tab, setTab] = useState<DetailTab>("about");

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

  const chapters = useMemo(
    () => [...(book?.chapters ?? [])].sort((a, b) => a.order - b.order),
    [book?.chapters]
  );
  const author = book ? bookAuthor(book.title) : null;
  const coverW = Math.min(180, Math.round(windowWidth * 0.42));
  const coverH = Math.round(coverW * 1.45);
  const firstChapter = chapters[0] ?? null;
  const editing = draft?.id != null;
  const tabInset = tabBarContentInset(insets.bottom);
  const actionBarHeight = 12 + 54 + 12;

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

  const toggleLibrary = async () => {
    if (!book || busyLibrary) return;
    setBusyLibrary(true);
    setError(null);
    const nextSaved = !book.inLibrary;
    // Otimista: ícone filled na hora
    setBook((current) => (current ? { ...current, inLibrary: nextSaved } : current));
    try {
      await request(`/books/${book.id}/library`, {
        method: book.inLibrary ? "DELETE" : "POST",
      });
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível atualizar a biblioteca";
      // Já estava salvo → trata como sucesso e sincroniza
      if (message.toLowerCase().includes("já está na sua biblioteca")) {
        setBook((current) => (current ? { ...current, inLibrary: true } : current));
        await load();
      } else {
        setBook((current) => (current ? { ...current, inLibrary: !nextSaved } : current));
        setError(message);
      }
    } finally {
      setBusyLibrary(false);
    }
  };

  const shareBook = async () => {
    if (!book) return;
    try {
      await Share.share({
        message: author ? `${book.title} — ${author}` : book.title,
      });
    } catch {
      // usuário cancelou
    }
  };

  const readBook = () => {
    if (chapters.length === 0) {
      if (book?.canEdit) {
        openCreate();
        return;
      }
      setTab("chapters");
      return;
    }
    void (async () => {
      const resumeId = await readBookResume(bookId);
      const target = resumeChapter(chapters, resumeId) ?? firstChapter;
      if (!target) {
        setTab("chapters");
        return;
      }
      router.push(`/books/${bookId}/chapters/${target.id}` as Href);
    })();
  };

  if (!book && !missing && !error) return <Loading />;

  return (
    <View style={{ flex: 1, backgroundColor: shell.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <RoundIcon
          name="chevron-back"
          label="Voltar"
          onPress={() => router.back()}
        />
        <Text style={{ color: shell.foreground, fontFamily: theme.fonts.bold, fontSize: 18 }}>
          Detalhes
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <RoundIcon name="share-outline" label="Compartilhar" onPress={() => void shareBook()} />
          <RoundIcon
            name={book?.inLibrary ? "bookmark" : "bookmark-outline"}
            label={book?.inLibrary ? "Remover dos salvos" : "Salvar na biblioteca"}
            onPress={() => void toggleLibrary()}
            color={book?.inLibrary ? ACCENT : shell.foreground}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: actionBarHeight + tabInset + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            marginTop: 18,
            alignSelf: "center",
            width: coverW + 28,
            height: coverH + 28,
            borderRadius: 28,
            backgroundColor: shell.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: coverW,
              height: coverH,
              borderRadius: 18,
              overflow: "hidden",
              backgroundColor: shell.chip,
            }}
          >
            {book ? <BookArt title={book.title} bookId={book.id} coverUrl={book.coverUrl} /> : null}
          </View>
        </View>

        <Text
          style={{
            marginTop: 22,
            textAlign: "center",
            color: shell.foreground,
            fontFamily: theme.fonts.bold,
            fontSize: 28,
            lineHeight: 34,
          }}
        >
          {book?.title ?? "Livro"}
        </Text>
        {author ? (
          <Text
            style={{
              marginTop: 6,
              textAlign: "center",
              color: shell.muted,
              fontFamily: theme.fonts.medium,
              fontSize: 15,
            }}
          >
            {author}
          </Text>
        ) : null}

        {error ? (
          <View style={{ marginTop: 12 }}>
            <ErrorText>{error}</ErrorText>
          </View>
        ) : null}
        {missing ? (
          <View style={{ marginTop: 12 }}>
            <Muted>Adicione o livro à biblioteca para ler os capítulos.</Muted>
          </View>
        ) : null}

        <View style={styles.tabs}>
          {(
            [
              { id: "about", label: "Sobre" },
              { id: "chapters", label: "Capítulos" },
              { id: "review", label: "Review" },
            ] as const
          ).map((item) => {
            const active = tab === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setTab(item.id)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text
                  style={{
                    color: active ? shell.foreground : shell.muted,
                    fontFamily: active ? theme.fonts.bold : theme.fonts.medium,
                    fontSize: 13,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === "about" ? (
          <View style={{ marginTop: 22 }}>
            <Text style={{ color: shell.foreground, fontFamily: theme.fonts.bold, fontSize: 20 }}>
              Sobre este livro
            </Text>
            <Text
              style={{
                marginTop: 10,
                color: shell.muted,
                fontFamily: theme.fonts.regular,
                fontSize: 15,
                lineHeight: 24,
              }}
            >
              {book?.description?.trim() ||
                "Este livro ainda não tem descrição. Abra os capítulos para começar a ler e salvar palavras."}
            </Text>
            <Text
              style={{
                marginTop: 16,
                color: shell.muted,
                fontFamily: theme.fonts.medium,
                fontSize: 13,
              }}
            >
              {chapters.length === 1
                ? "1 capítulo"
                : `${chapters.length} capítulos`}
              {book?.isOfficial ? " · Acervo" : " · Seu livro"}
              {typeof book?.readingFraction === "number" && book.readingFraction > 0
                ? ` · ${Math.round(book.readingFraction * 100)}% lido`
                : ""}
            </Text>
            {(book?.wordCount ?? 0) > 0 ? (
              <Text
                style={{
                  marginTop: 8,
                  color: shell.muted,
                  fontFamily: theme.fonts.medium,
                  fontSize: 13,
                }}
              >
                {(book?.wordCount ?? 0).toLocaleString("pt-BR")}{" "}
                {(book?.wordCount ?? 0) === 1 ? "palavra" : "palavras"}
                {" · ~"}
                {book?.readingMinutes ?? 0} min de leitura
              </Text>
            ) : null}
          </View>
        ) : null}

        {tab === "chapters" ? (
          <View style={{ marginTop: 18 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: shell.foreground, fontFamily: theme.fonts.bold, fontSize: 20 }}>
                Capítulos
              </Text>
              {book?.canEdit ? (
                <Pressable onPress={openCreate} hitSlop={8}>
                  <Text style={{ color: ACCENT, fontFamily: theme.fonts.bold, fontSize: 14 }}>
                    + Adicionar
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {chapters.length === 0 ? (
              <View style={{ gap: 12, marginTop: 8 }}>
                <Muted>
                  {book?.canEdit
                    ? "Este livro ainda não tem capítulos. Adicione o primeiro para começar a ler."
                    : "Este livro ainda não tem capítulos."}
                </Muted>
                {book?.canEdit ? (
                  <PrimaryButton label="Adicionar capítulo" onPress={openCreate} />
                ) : null}
              </View>
            ) : (
              chapters.map((chapter, index) => (
                <View
                  key={chapter.id}
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: shell.line,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Pressable
                    onPress={() =>
                      router.push(`/books/${bookId}/chapters/${chapter.id}` as Href)
                    }
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: shell.muted,
                          fontFamily: theme.fonts.semibold,
                          fontSize: 12,
                        }}
                      >
                        Capítulo {index + 1}
                        {!chapter.reachedEndAt &&
                        chapter.contentLength &&
                        chapter.contentOffset != null
                          ? ` · ${Math.min(
                              100,
                              Math.round(
                                (chapter.contentOffset / chapter.contentLength) * 100
                              )
                            )}%`
                          : ""}
                      </Text>
                      {chapter.reachedEndAt ? (
                        <Ionicons name="checkmark-circle" size={16} color="#24c875" />
                      ) : null}
                    </View>
                    <Text
                      style={{
                        color: shell.foreground,
                        fontFamily: theme.fonts.bold,
                        fontSize: 16,
                        marginTop: 2,
                      }}
                    >
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
                      <Ionicons name="create-outline" size={22} color={shell.foreground} />
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ) : null}

        {tab === "review" ? (
          <View style={{ marginTop: 22, gap: 8 }}>
            <Text style={{ color: shell.foreground, fontFamily: theme.fonts.bold, fontSize: 20 }}>
              Reviews
            </Text>
            <Muted>Em breve você poderá ver e deixar avaliações dos livros.</Muted>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: tabInset,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 12,
          backgroundColor: shell.background,
          borderTopWidth: 1,
          borderTopColor: shell.line,
        }}
      >
        <Pressable
          onPress={readBook}
          disabled={!book || missing}
          style={{
            height: 54,
            borderRadius: 999,
            backgroundColor: ACCENT,
            alignItems: "center",
            justifyContent: "center",
            opacity: !book || missing ? 0.45 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontFamily: theme.fonts.bold, fontSize: 16 }}>
            {firstChapter ? "Ler livro" : book?.canEdit ? "Adicionar capítulo" : "Ver capítulos"}
          </Text>
        </Pressable>
      </View>

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
                onChangeText={(content) =>
                  setDraft((current) => (current ? { ...current, content } : current))
                }
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
    </View>
  );
}

function RoundIcon({
  name,
  label,
  onPress,
  color = shell.foreground,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: shell.chip,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={20} color={color} />
    </Pressable>
  );
}

const styles = {
  tabs: {
    marginTop: 22,
    flexDirection: "row" as const,
    backgroundColor: shell.surface,
    borderRadius: 999,
    padding: 4,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  tabActive: {
    backgroundColor: shell.chip,
  },
};
