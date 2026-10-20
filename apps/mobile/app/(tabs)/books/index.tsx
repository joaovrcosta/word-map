import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { type Href, router, useFocusEffect } from "expo-router";
import { useSession } from "../../../src/session";
import { useTheme } from "../../../src/theme";
import { countLabel, type BookListItem } from "../../../src/types";
import { ErrorText, Heading, Loading, Muted, Screen } from "../../../src/ui";

type Tab = "store" | "mine";

export default function BooksScreen() {
  const theme = useTheme();
  const { request, user } = useSession();
  const isStaff = user?.role === "ADMIN" || user?.role === "MODERATOR";
  const [tab, setTab] = useState<Tab>("store");
  const [official, setOfficial] = useState<BookListItem[] | null>(null);
  const [mine, setMine] = useState<BookListItem[]>([]);
  const [library, setLibrary] = useState<BookListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

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

  if (!official) return <Loading />;

  return (
    <Screen>
      <Heading>Livros</Heading>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        {(
          [
            ["store", "Loja"],
            ["mine", "Meus"],
          ] as const
        ).map(([value, label]) => {
          const selected = tab === value;
          return (
            <Pressable
              key={value}
              onPress={() => setTab(value)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: theme.radii.lg,
                backgroundColor: selected ? theme.colors.green : theme.colors.card,
                borderWidth: 1,
                borderColor: selected ? theme.colors.green : theme.colors.border,
              }}
            >
              <Text
                style={{
                  color: selected ? "#ffffff" : theme.colors.foreground,
                  fontFamily: theme.fonts.bold,
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <ErrorText>{error}</ErrorText> : null}
      <ScrollView style={{ marginTop: 8, flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {tab === "store" ? (
          official.length === 0 ? (
            <Muted>Nenhum livro na loja.</Muted>
          ) : (
            official.map((book) => (
              <BookRow
                key={book.id}
                book={book}
                busy={busyId === book.id}
                actionLabel={book.inLibrary ? "Remover" : "Adicionar"}
                onOpen={() => void openBook(book)}
                onAction={() => void toggleLibrary(book)}
              />
            ))
          )
        ) : mine.length === 0 && library.length === 0 ? (
          <Muted>Nenhum livro ainda. Adicione um na loja.</Muted>
        ) : (
          <>
            <Section title="Criados por mim" books={mine} onOpen={openBook} />
            <Section
              title="Biblioteca"
              books={library}
              onOpen={openBook}
              actionLabel="Remover"
              busyId={busyId}
              onAction={toggleLibrary}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Section({
  title,
  books,
  onOpen,
  actionLabel,
  busyId,
  onAction,
}: {
  title: string;
  books: BookListItem[];
  onOpen: (book: BookListItem) => void;
  actionLabel?: string;
  busyId?: number | null;
  onAction?: (book: BookListItem) => void;
}) {
  const theme = useTheme();
  if (books.length === 0) return null;
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.bold, fontSize: 13 }}>
        {title}
      </Text>
      {books.map((book) => (
        <BookRow
          key={book.id}
          book={book}
          busy={busyId === book.id}
          actionLabel={actionLabel}
          onOpen={() => onOpen(book)}
          onAction={onAction ? () => onAction(book) : undefined}
        />
      ))}
    </View>
  );
}

function BookRow({
  book,
  onOpen,
  onAction,
  actionLabel,
  busy,
}: {
  book: BookListItem;
  onOpen: () => void;
  onAction?: () => void;
  actionLabel?: string;
  busy: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        paddingVertical: 14,
      }}
    >
      <Pressable onPress={onOpen} style={{ flex: 1 }} disabled={busy}>
        <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 17 }}>
          {book.title}
        </Text>
        {book.description ? (
          <Text
            numberOfLines={2}
            style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.regular, marginTop: 4 }}
          >
            {book.description}
          </Text>
        ) : null}
        <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.semibold, marginTop: 6 }}>
          {countLabel(book.chapterCount, "capítulo", "capítulos")}
        </Text>
      </Pressable>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} disabled={busy}>
          <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.bold }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
