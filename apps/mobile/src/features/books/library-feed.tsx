import { useCallback, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { formatNewsDate } from "../news/format";
import type { NewsListItem } from "../news/types";
import { useSession } from "../../session";
import { useTheme } from "../../theme";
import { countLabel, type BookDetail, type BookListItem } from "../../types";
import { ErrorText, Field, Heading, Loading, Muted, PrimaryButton, Screen } from "../../ui";
import { pickResumeChapter, readBookResume } from "../reading";
import { StudyOffenseChip } from "../study/offense-chip";
import { OffenseSheet } from "../study/offense-sheet";
import { BookArt, bookAuthor } from "./cover";

type Shelf = "foryou" | "store" | "saved" | "mine";

const SHELVES: Array<{ value: Shelf; label: string }> = [
  { value: "foryou", label: "Para você" },
  { value: "store", label: "Acervo" },
  { value: "saved", label: "Salvos" },
  { value: "mine", label: "Meus" },
];

const COVER_WIDTH = 132;

type Rail = {
  key: string;
  title: string;
  books: BookListItem[];
  shelf?: Shelf;
};

function asShelf(value: string | string[] | undefined): Shelf | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "foryou" || raw === "store" || raw === "saved" || raw === "mine") return raw;
  return null;
}

export function LibraryFeed() {
  const theme = useTheme();
  const { request, user } = useSession();
  const params = useLocalSearchParams<{ shelf?: string }>();
  const isStaff = user?.role === "ADMIN" || user?.role === "MODERATOR";
  const [official, setOfficial] = useState<BookListItem[] | null>(null);
  const [mine, setMine] = useState<BookListItem[]>([]);
  const [library, setLibrary] = useState<BookListItem[]>([]);
  const [continueBook, setContinueBook] = useState<BookListItem | null>(null);
  const [news, setNews] = useState<NewsListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [shelf, setShelf] = useState<Shelf>(() => asShelf(params.shelf) ?? "foryou");
  const [creating, setCreating] = useState(false);
  const [offenseOpen, setOffenseOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [officialBooks, myBooks, libraryBooks, continueReadingBook, newsArticles] =
        await Promise.all([
          request<BookListItem[]>("/books/official"),
          request<BookListItem[]>("/books/mine"),
          request<BookListItem[]>("/books/library"),
          request<BookListItem | null>("/books/continue").catch(() => null),
          request<NewsListItem[]>("/news").catch(() => [] as NewsListItem[]),
        ]);
      setOfficial(officialBooks);
      setMine(myBooks);
      setLibrary(libraryBooks);
      setContinueBook(continueReadingBook);
      setNews(newsArticles);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os livros");
      setOfficial((current) => current ?? []);
    }
  }, [request]);

  useFocusEffect(
    useCallback(() => {
      const nextShelf = asShelf(params.shelf);
      if (nextShelf) setShelf(nextShelf);
      void load();
    }, [load, params.shelf])
  );

  const openBook = async (book: BookListItem) => {
    setBusyId(book.id);
    setError(null);
    try {
      if (book.isOfficial && !book.inLibrary && !isStaff) {
        await request(`/books/${book.id}/library`, { method: "POST" });
      }
      router.push(`/books/${book.id}` as Href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir o livro");
    } finally {
      setBusyId(null);
    }
  };

  const continueReading = async (book: BookListItem) => {
    setBusyId(book.id);
    setError(null);
    try {
      if (book.isOfficial && !book.inLibrary && !isStaff) {
        await request(`/books/${book.id}/library`, { method: "POST" });
      }
      const detail = await request<BookDetail | null>(`/books/${book.id}`);
      const chapters = [...(detail?.chapters ?? [])].sort((a, b) => a.order - b.order);
      const resumeId = user?.id != null ? await readBookResume(user.id, book.id) : null;
      const target = pickResumeChapter(chapters, resumeId) ?? chapters[0] ?? null;
      if (!target) {
        router.push(`/books/${book.id}` as Href);
        return;
      }
      router.push(`/books/${book.id}/chapters/${target.id}` as Href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível continuar a leitura");
    } finally {
      setBusyId(null);
    }
  };

  const toggleLibrary = async (book: BookListItem) => {
    setBusyId(book.id);
    setError(null);
    const savingBook = !book.inLibrary;
    try {
      await request(`/books/${book.id}/library`, {
        method: book.inLibrary ? "DELETE" : "POST",
      });
      await load();
      if (savingBook) setShelf("saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a biblioteca");
    } finally {
      setBusyId(null);
    }
  };

  const openCreate = () => {
    setDraftTitle("");
    setDraftDescription("");
    setCreating(true);
    setError(null);
  };

  const closeCreate = () => {
    if (saving) return;
    setCreating(false);
    setDraftTitle("");
    setDraftDescription("");
  };

  const createBook = async () => {
    const title = draftTitle.trim();
    if (!title || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await request<BookListItem>("/books", {
        method: "POST",
        body: JSON.stringify({
          title,
          description: draftDescription.trim() || undefined,
        }),
      });
      setCreating(false);
      setDraftTitle("");
      setDraftDescription("");
      setShelf("mine");
      await load();
      if (created?.id != null) {
        router.push(`/books/${created.id}` as Href);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar o livro");
    } finally {
      setSaving(false);
    }
  };

  const matches = useCallback(
    (book: BookListItem) => book.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    [query]
  );

  const rails = useMemo((): Rail[] => {
    const officialBooks = (official ?? []).filter(matches);
    const myBooks = mine.filter(matches);
    const saved = library.filter(matches);
    if (shelf === "store") return officialBooks.length ? [{ key: "store", title: "Acervo", books: officialBooks }] : [];
    if (shelf === "saved") return saved.length ? [{ key: "saved", title: "Salvos", books: saved }] : [];
    if (shelf === "mine") return myBooks.length ? [{ key: "mine", title: "Meus", books: myBooks }] : [];
    const savedOnly = saved.filter(
      (book) => !officialBooks.some((item) => item.id === book.id) && !myBooks.some((item) => item.id === book.id)
    );
    return (
      [
        { key: "store", title: "Escolhidos para você", books: officialBooks, shelf: "store" },
        { key: "mine", title: "Meus", books: myBooks, shelf: "mine" },
        { key: "saved", title: "Salvos", books: savedOnly, shelf: "saved" },
      ] satisfies Rail[]
    ).filter((section) => section.books.length > 0);
  }, [library, matches, mine, official, shelf]);

  if (!official) return <Loading />;

  const emptyMessage = query.trim()
    ? "Nenhum livro com esse nome."
    : shelf === "mine"
      ? "Você ainda não criou nenhum livro."
      : shelf === "saved"
        ? "Você ainda não salvou nenhum livro."
        : "Nenhum livro no acervo ainda.";

  return (
    <Screen scroll>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text
          style={{
            flex: 1,
            color: theme.shell.foreground,
            fontFamily: theme.fonts.serifItalic,
            fontSize: 28,
            lineHeight: 34,
          }}
          numberOfLines={1}
        >
          WordMap
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <StudyOffenseChip compact onPress={() => setOffenseOpen(true)} />
          <HeaderIconButton
            name="search-outline"
            label="Buscar"
            onPress={() => {
              setSearchOpen((open) => !open);
              if (searchOpen) setQuery("");
            }}
          />
          <HeaderIconButton name="add" label="Adicionar conteúdo" onPress={openCreate} />
        </View>
      </View>

      {searchOpen ? (
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar no acervo"
          placeholderTextColor={theme.colors.mutedForeground}
          style={{
            marginTop: 14,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: theme.colors.foreground,
            fontFamily: theme.fonts.medium,
            fontSize: 16,
            backgroundColor: theme.colors.card,
          }}
        />
      ) : null}

      <View
        style={{
          marginTop: 18,
          marginHorizontal: -20,
          borderBottomWidth: 1,
          borderBottomColor: theme.shell.line,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 22 }}
        >
          {SHELVES.map((item) => {
            const selected = shelf === item.value;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setShelf(item.value)}
                style={{
                  paddingBottom: 10,
                  borderBottomWidth: 2,
                  borderBottomColor: selected ? theme.shell.foreground : "transparent",
                }}
              >
                <Text
                  style={{
                    color: selected ? theme.shell.foreground : theme.shell.muted,
                    fontFamily: selected ? theme.fonts.bold : theme.fonts.medium,
                    fontSize: 15,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {error ? <ErrorText>{error}</ErrorText> : null}

      {continueBook ? (
        <View style={{ marginTop: 22 }}>
          <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 22 }}>Continuar</Text>
          <ContinueCard
            book={continueBook}
            busy={busyId === continueBook.id}
            onOpen={() => void continueReading(continueBook)}
          />
        </View>
      ) : null}

      {shelf === "foryou" && !query.trim() && news.length > 0 ? (
        <NewsRail
          articles={news.slice(0, 5)}
          onSeeAll={() => router.push("/news" as Href)}
          onOpen={(article) => router.push(`/news/${article.id}` as Href)}
        />
      ) : null}

      {rails.length === 0 ? (
        <View style={{ marginTop: 28, gap: 14 }}>
          <Muted>{emptyMessage}</Muted>
          {!query.trim() ? <PrimaryButton label="Criar meu livro" onPress={openCreate} /> : null}
        </View>
      ) : (
        rails.map((section) => (
          <BookRail
            key={section.key}
            title={section.title}
            books={section.books}
            busyId={busyId}
            onSeeAll={
              section.shelf
                ? () => {
                  const next = section.shelf;
                  if (next) setShelf(next);
                }
                : undefined
            }
            onOpen={(book) => void openBook(book)}
            onToggle={(book) => void toggleLibrary(book)}
          />
        ))
      )}

      <OffenseSheet
        visible={offenseOpen}
        onClose={() => setOffenseOpen(false)}
        onSeeStats={() => router.push("/profile" as Href)}
      />

      <Modal animationType="fade" transparent visible={creating} onRequestClose={closeCreate}>
        <Pressable
          style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.45)" }}
          onPress={closeCreate}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{
              backgroundColor: theme.shell.surface,
              borderRadius: theme.radii.lg,
              padding: 20,
              borderWidth: 1,
              borderColor: theme.shell.line,
            }}
          >
            <Heading>Novo livro</Heading>
            <Muted>Crie o seu próprio livro e depois adicione capítulos.</Muted>
            <Field
              autoFocus
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="Título do livro"
              style={{ marginTop: 12 }}
            />
            <Field
              value={draftDescription}
              onChangeText={setDraftDescription}
              placeholder="Descrição (opcional)"
              multiline
              style={{ marginTop: 10, minHeight: 88, textAlignVertical: "top" }}
            />
            <PrimaryButton
              label={saving ? "Criando..." : "Criar livro"}
              disabled={saving || !draftTitle.trim()}
              onPress={() => void createBook()}
            />
            <Pressable onPress={closeCreate} style={{ alignItems: "center", marginTop: 14 }}>
              <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.semibold }}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function ContinueCard({ book, busy, onOpen }: { book: BookListItem; busy: boolean; onOpen: () => void }) {
  const theme = useTheme();
  const author = bookAuthor(book.title);
  const subtitle = author ?? countLabel(book.chapterCount, "capítulo", "capítulos");

  return (
    <Pressable
      onPress={onOpen}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`Continuar ${book.title}`}
      style={{
        marginTop: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 16,
        backgroundColor: theme.shell.surface,
        opacity: busy ? 0.55 : 1,
      }}
    >
      <View
        style={{
          width: 52,
          height: 72,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: "#f6f1e6",
        }}
      >
        <BookArt title={book.title} bookId={book.id} coverUrl={book.coverUrl} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          numberOfLines={2}
          style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 15, lineHeight: 20 }}
        >
          {book.title}
        </Text>
        <Text numberOfLines={1} style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 13 }}>
          {subtitle}
        </Text>
      </View>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.shell.tones.lilac,
        }}
      >
        <Ionicons name="play" size={18} color={theme.shell.onPastel} style={{ marginLeft: 2 }} />
      </View>
    </Pressable>
  );
}

function NewsRail({
  articles,
  onSeeAll,
  onOpen,
}: {
  articles: NewsListItem[];
  onSeeAll: () => void;
  onOpen: (article: NewsListItem) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ marginTop: 26 }}>
      <Pressable
        onPress={onSeeAll}
        accessibilityRole="button"
        accessibilityLabel="Ver notícias"
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}
      >
        <Text style={{ flex: 1, color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 22 }}>
          Notícias
        </Text>
        <Ionicons name="chevron-forward" size={20} color={theme.shell.muted} />
      </Pressable>
      <View style={{ marginTop: 14, gap: 16 }}>
        {articles.map((article) => (
          <Pressable
            key={article.id}
            onPress={() => onOpen(article)}
            accessibilityRole="button"
            accessibilityLabel={article.title}
            style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}
          >
            {article.imageUrl ? (
              <Image
                source={{ uri: article.imageUrl }}
                style={{ width: 88, height: 88, borderRadius: 4 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 4,
                  backgroundColor: theme.shell.surface,
                  borderWidth: 1,
                  borderColor: theme.shell.line,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="newspaper-outline" size={28} color={theme.shell.muted} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  color: theme.shell.muted,
                  fontFamily: theme.fonts.semibold,
                  fontSize: 12,
                }}
                numberOfLines={1}
              >
                {article.section}
                {formatNewsDate(article.publishedAt)
                  ? ` · ${formatNewsDate(article.publishedAt)}`
                  : ""}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  color: theme.shell.foreground,
                  fontFamily: theme.fonts.serifItalic,
                  fontSize: 18,
                  lineHeight: 24,
                }}
                numberOfLines={3}
              >
                {article.title}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function BookRail({
  title,
  books,
  busyId,
  onSeeAll,
  onOpen,
  onToggle,
}: {
  title: string;
  books: BookListItem[];
  busyId: number | null;
  onSeeAll?: () => void;
  onOpen: (book: BookListItem) => void;
  onToggle: (book: BookListItem) => void;
}) {
  const theme = useTheme();
  const header = (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ flex: 1, color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 22 }}>{title}</Text>
      {onSeeAll ? <Ionicons name="chevron-forward" size={20} color={theme.shell.muted} /> : null}
    </View>
  );

  return (
    <View style={{ marginTop: 26 }}>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} accessibilityRole="button" accessibilityLabel={`Ver ${title}`}>
          {header}
        </Pressable>
      ) : (
        header
      )}
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -20, marginTop: 14 }}
        contentContainerStyle={{ gap: 14, paddingHorizontal: 20 }}
      >
        {books.map((book) => (
          <CoverCard
            key={book.id}
            book={book}
            busy={busyId === book.id}
            onOpen={() => onOpen(book)}
            onToggle={() => onToggle(book)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function CoverCard({
  book,
  busy,
  onOpen,
  onToggle,
}: {
  book: BookListItem;
  busy: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const height = Math.round(COVER_WIDTH * 1.45);

  return (
    <View style={{ width: COVER_WIDTH, opacity: busy ? 0.55 : 1 }}>
      <Pressable
        onPress={onOpen}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={book.title}
        style={{
          width: COVER_WIDTH,
          height,
          borderRadius: 14,
          overflow: "hidden",
          backgroundColor: "#f6f1e6",
        }}
      >
        <BookArt title={book.title} bookId={book.id} coverUrl={book.coverUrl} />
      </Pressable>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 4, marginTop: 8 }}>
        <Pressable onPress={onOpen} disabled={busy} style={{ flex: 1 }}>
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.foreground,
              fontFamily: theme.fonts.medium,
              fontSize: 13,
              lineHeight: 17,
            }}
          >
            {book.title}
          </Text>
        </Pressable>
        <Pressable
          onPress={onToggle}
          disabled={busy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={book.inLibrary ? "Remover da biblioteca" : "Salvar na biblioteca"}
        >
          <Ionicons
            name={book.inLibrary ? "heart" : "heart-outline"}
            size={16}
            color={book.inLibrary ? "#ff4d6d" : theme.colors.foreground}
          />
        </Pressable>
      </View>
      <Text style={{ marginTop: 4, color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 12 }}>
        {countLabel(book.chapterCount, "capítulo", "capítulos")}
      </Text>
    </View>
  );
}

function HeaderIconButton({
  name,
  label,
  onPress,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 36,
        height: 36,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={24} color={theme.shell.foreground} />
    </Pressable>
  );
}
