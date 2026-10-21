import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Href, router, useFocusEffect } from "expo-router";
import { BookArt } from "../../../src/features/books/cover";
import { useSession } from "../../../src/session";
import { useTheme } from "../../../src/theme";
import type { BookListItem } from "../../../src/types";
import { Chip, ErrorText, Loading, Muted, Screen } from "../../../src/ui";

type Shelf = "all" | "store" | "saved" | "mine";

const SHELVES: Array<{ value: Shelf; label: string }> = [
  { value: "all", label: "Tudo" },
  { value: "store", label: "Acervo" },
  { value: "saved", label: "Salvos" },
  { value: "mine", label: "Meus" },
];

export default function BooksScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { request, user } = useSession();
  const isStaff = user?.role === "ADMIN" || user?.role === "MODERATOR";
  const [official, setOfficial] = useState<BookListItem[] | null>(null);
  const [mine, setMine] = useState<BookListItem[]>([]);
  const [library, setLibrary] = useState<BookListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [shelf, setShelf] = useState<Shelf>("all");

  const load = useCallback(async () => {
    try {
      const [officialBooks, myBooks, libraryBooks] = await Promise.all([
        request<BookListItem[]>("/books/official"),
        request<BookListItem[]>("/books/mine"),
        request<BookListItem[]>("/books/library"),
      ]);
      setOfficial(officialBooks);
      setMine(myBooks);
      setLibrary(libraryBooks);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar os livros");
      setOfficial((current) => current ?? []);
    }
  }, [request]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
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

  const toggleLibrary = async (book: BookListItem) => {
    setBusyId(book.id);
    setError(null);
    try {
      await request(`/books/${book.id}/library`, {
        method: book.inLibrary ? "DELETE" : "POST",
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a biblioteca");
    } finally {
      setBusyId(null);
    }
  };

  const matches = useCallback(
    (book: BookListItem) => book.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    [query]
  );

  const sections = useMemo(() => {
    const officialBooks = (official ?? []).filter(matches);
    const myBooks = mine.filter(matches);
    const saved = library.filter(matches);
    if (shelf === "store") return [{ key: "store", title: "Acervo", books: officialBooks }];
    if (shelf === "saved") return [{ key: "saved", title: "Salvos", books: saved }];
    if (shelf === "mine") return [{ key: "mine", title: "Meus", books: myBooks }];
    const savedOnly = saved.filter(
      (book) => !officialBooks.some((item) => item.id === book.id) && !myBooks.some((item) => item.id === book.id)
    );
    return [
      { key: "store", title: "Acervo", books: officialBooks },
      { key: "mine", title: "Meus", books: myBooks },
      { key: "saved", title: "Salvos", books: savedOnly },
    ].filter((section) => section.books.length > 0);
  }, [library, matches, mine, official, shelf]);

  if (!official) return <Loading />;

  const gap = 14;
  const columns = 3;
  const coverWidth = Math.floor((width - 40 - gap * (columns - 1)) / columns);

  return (
    <Screen scroll>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 32 }}>
          Biblioteca
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <RoundButton
            name="search"
            label="Buscar"
            onPress={() => {
              setSearchOpen((open) => !open);
              if (searchOpen) setQuery("");
            }}
          />
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
            marginTop: 16,
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

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
        {SHELVES.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            selected={shelf === item.value}
            onPress={() => setShelf(item.value)}
          />
        ))}
      </View>

      {error ? <ErrorText>{error}</ErrorText> : null}

      {sections.length === 0 ? (
        <View style={{ marginTop: 28 }}>
          <Muted>{query.trim() ? "Nenhum livro com esse nome." : "Nenhum livro no acervo ainda."}</Muted>
        </View>
      ) : (
        sections.map((section) => (
          <ShelfSection
            key={section.key}
            title={section.title}
            books={section.books}
            coverWidth={coverWidth}
            gap={gap}
            busyId={busyId}
            onOpen={(book) => void openBook(book)}
            onToggle={(book) => void toggleLibrary(book)}
          />
        ))
      )}
    </Screen>
  );
}

function ShelfSection({
  title,
  books,
  coverWidth,
  gap,
  busyId,
  onOpen,
  onToggle,
}: {
  title: string;
  books: BookListItem[];
  coverWidth: number;
  gap: number;
  busyId: number | null;
  onOpen: (book: BookListItem) => void;
  onToggle: (book: BookListItem) => void;
}) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded || books.length <= 6 ? books : books.slice(0, 6);

  return (
    <View style={{ marginTop: 26 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 26 }}>{title}</Text>
        {books.length > 6 ? (
          <Pressable onPress={() => setExpanded((open) => !open)} hitSlop={8}>
            <Text style={{ color: "#f08a24", fontFamily: theme.fonts.bold, fontSize: 16 }}>
              {expanded ? "Menos" : "Mais →"}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap, marginTop: 14 }}>
        {visible.map((book) => (
          <BookCover
            key={book.id}
            book={book}
            width={coverWidth}
            busy={busyId === book.id}
            onOpen={() => onOpen(book)}
            onToggle={() => onToggle(book)}
          />
        ))}
      </View>
    </View>
  );
}

function BookCover({
  book,
  width,
  busy,
  onOpen,
  onToggle,
}: {
  book: BookListItem;
  width: number;
  busy: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const height = Math.round(width * 1.28);

  return (
    <View style={{ width, opacity: busy ? 0.55 : 1 }}>
      <Pressable
        onPress={onOpen}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={book.title}
        style={{
          width,
          height,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#f6f1e6",
        }}
      >
        <BookArt title={book.title} bookId={book.id} />
        {book.isOfficial ? <FreeRibbon /> : null}
      </Pressable>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 4, marginTop: 8 }}>
        <Text
          numberOfLines={2}
          style={{
            flex: 1,
            color: theme.colors.foreground,
            fontFamily: theme.fonts.medium,
            fontSize: 13,
            lineHeight: 17,
          }}
        >
          {book.title}
        </Text>
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
    </View>
  );
}

function FreeRibbon() {
  const theme = useTheme();
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        top: 18,
        width: 18,
        height: 72,
        backgroundColor: "#2a2a2a",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Text
        style={{
          position: "absolute",
          width: 72,
          left: -27,
          top: 28,
          textAlign: "center",
          color: "#ffffff",
          fontSize: 9,
          letterSpacing: 0.6,
          fontFamily: theme.fonts.bold,
          transform: [{ rotate: "-90deg" }],
        }}
      >
        GRÁTIS!
      </Text>
    </View>
  );
}

function RoundButton({
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
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 42,
        height: 42,
        borderRadius: 21,
        borderWidth: 1.5,
        borderColor: theme.colors.foreground,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={20} color={theme.colors.foreground} />
    </Pressable>
  );
}
