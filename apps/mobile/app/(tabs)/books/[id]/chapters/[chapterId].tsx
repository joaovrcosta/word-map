import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { BookArt, bookAuthor } from "../../../../../src/features/books/cover";
import {
  formatChapterContent,
  normalizeReadingPosition,
  normalizeToken,
  paginateReading,
} from "@word-map/shared";
import {
  findSavedReadingWord,
  MAX_RANGE_WORDS,
  nextRangeIndexes,
  ReadingPageText,
  ReadingWordMenu,
  spanFromIndexes,
  tokenizePageText,
  type FoundTextWord,
  type WordAnchor,
} from "../../../../../src/features/reading";
import { speakPassage, speakWord, stopSpeech } from "../../../../../src/speech";
import { useSession } from "../../../../../src/session";
import { shell, useTheme } from "../../../../../src/theme";
import { type ChapterDetail, type ReadingPosition, type Vault } from "../../../../../src/types";
import { ErrorText, Field, Heading, Loading, PrimaryButton, Screen } from "../../../../../src/ui";

const FONT_SIZES = [18, 22, 26];
const LEVEL_COLORS = ["#ff4b4b", "#ff9600", "#ffc800", "#24c875"];
const LEVEL_TEXT = ["#ffffff", "#ffffff", "#3c3c3c", "#ffffff"];

function softTapHaptic() {
  if (Platform.OS === "web") return;
  void Haptics.selectionAsync();
}

export default function ChapterReaderScreen() {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const { request } = useSession();
  const params = useLocalSearchParams<{ id: string; chapterId: string }>();
  const chapterId = Number(params.chapterId);
  const sheetMaxHeight = Math.round(windowHeight * 0.86);
  const contentMaxHeight = Math.max(140, Math.round(windowHeight * 0.34));
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [fontSize, setFontSize] = useState(FONT_SIZES[0]);
  const [width, setWidth] = useState(0);
  const [settled, setSettled] = useState(false);
  const [foundWords, setFoundWords] = useState<FoundTextWord[]>([]);
  const [bookWords, setBookWords] = useState<BookWord[]>([]);
  const [wordsOpen, setWordsOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [selection, setSelection] = useState<{
    clean: string;
    occurrence: number;
    anchor: WordAnchor;
    full?: boolean;
  } | null>(null);
  const [rangeIndexes, setRangeIndexes] = useState<number[] | null>(null);
  const [rangeAnchor, setRangeAnchor] = useState<WordAnchor | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const pageIndexRef = useRef(0);
  const pagesRef = useRef<ReturnType<typeof paginateReading>>([]);
  const widthRef = useRef(0);
  const keepListening = useRef(false);
  const advancing = useRef(false);
  const openedAt = useRef(0);

  const pages = useMemo(
    () => (chapter ? paginateReading(chapter.content) : []),
    [chapter]
  );
  pagesRef.current = pages;
  widthRef.current = width;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [detail, progress] = await Promise.all([
          request<ChapterDetail | null>(`/chapters/${chapterId}`),
          request<ReadingPosition | null>(`/chapters/${chapterId}/progress`),
        ]);
        if (cancelled) return;
        if (!detail) {
          setMissing(true);
          setHydrated(true);
          return;
        }
        const nextPages = paginateReading(detail.content);
        const position = progress
          ? normalizeReadingPosition(nextPages, progress.paragraphIndex, progress.pageIndex)
          : { pageIndex: 0, paragraphIndex: 0 };
        pageIndexRef.current = position.pageIndex;
        setPageIndex(position.pageIndex);
        setChapter(detail);
        setHydrated(true);
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Não foi possível abrir o capítulo");
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chapterId, request]);

  useEffect(() => {
    if (!hydrated || !width) return;
    scrollRef.current?.scrollTo({ x: pageIndexRef.current * width, animated: false });
    setSettled(true);
  }, [hydrated, width]);

  const reloadWords = useCallback(async () => {
    if (!chapter) return;
    const [found, nextVaults] = await Promise.all([
      request<FoundTextWord[]>("/words/check-text", {
        method: "POST",
        body: JSON.stringify({ content: chapter.content }),
      }),
      request<Vault[]>("/vaults"),
    ]);
    setFoundWords(found);
    setVaults(nextVaults);
    try {
      const savedInBook = await request<BookWord[]>(
        `/words/by-book?title=${encodeURIComponent(chapter.bookTitle)}`
      );
      setBookWords(Array.isArray(savedInBook) ? savedInBook : []);
    } catch {
      setBookWords([]);
    }
  }, [chapter, request]);

  useEffect(() => {
    if (!chapter) return;
    let cancelled = false;
    reloadWords().catch(() => {
      if (!cancelled) {
        setFoundWords([]);
        setVaults([]);
        setBookWords([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [chapter, reloadWords]);

  useEffect(() => {
    setSelection(null);
    setRangeIndexes(null);
    setRangeAnchor(null);
  }, [pageIndex, fontSize]);

  useEffect(() => {
    if (!settled || !chapter) return;
    const handle = setTimeout(() => {
      const page = pages[pageIndex];
      const paragraphIndex = page?.slices[0]?.paragraphIndex ?? 0;
      void request(`/chapters/${chapterId}/progress`, {
        method: "PUT",
        body: JSON.stringify({ pageIndex, paragraphIndex }),
      }).catch(() => undefined);
    }, 400);
    return () => clearTimeout(handle);
  }, [chapter, chapterId, pageIndex, pages, request, settled]);

  const vaultWords = useMemo(
    () =>
      new Set(
        foundWords
          .map((item) => normalizeToken(item.word))
          .filter((word) => word && !word.includes(" "))
      ),
    [foundWords]
  );

  const vaultPhrases = useMemo(
    () =>
      foundWords
        .map((item) => item.word.trim())
        .filter((word) => word.split(/\s+/).filter(Boolean).length >= 2),
    [foundWords]
  );

  const listedWords = useMemo(() => {
    const merged = new Map<number, BookWord>();
    for (const word of wordsSavedInChapter(foundWords)) merged.set(word.id, word);
    for (const word of bookWords) {
      const current = merged.get(word.id);
      merged.set(word.id, {
        ...current,
        ...word,
        translations: word.translations.length ? word.translations : (current?.translations ?? []),
        meaning: word.meaning || current?.meaning || word.translations[0] || "",
      });
    }
    return [...merged.values()];
  }, [bookWords, foundWords]);

  const selectWord = (clean: string, occurrence: number, anchor: WordAnchor, full = false) => {
    openedAt.current = Date.now();
    keepListening.current = false;
    setListening(false);
    setRangeIndexes(null);
    setRangeAnchor(null);
    setSelection({ clean, occurrence, anchor, full });
    speakWord(clean);
  };

  const beginRange = (clean: string, occurrence: number, anchor: WordAnchor, tokenIndex: number) => {
    openedAt.current = Date.now();
    keepListening.current = false;
    setListening(false);
    setSelection(null);
    setRangeIndexes([tokenIndex]);
    setRangeAnchor(anchor);
    softTapHaptic();
    speakWord(clean);
  };

  const toggleRange = (tokenIndex: number, _clean: string, _occurrence: number, anchor: WordAnchor) => {
    const prev = rangeIndexes ?? [];
    const next = nextRangeIndexes(prev, tokenIndex, MAX_RANGE_WORDS);
    if (next.length > prev.length) softTapHaptic();
    setRangeIndexes(next);
    setRangeAnchor(anchor);
  };

  const cancelRange = () => {
    setRangeIndexes(null);
    setRangeAnchor(null);
  };

  const confirmRange = () => {
    if (!rangeIndexes?.length || !rangeSpan) return;
    const sorted = [...rangeIndexes].sort((a, b) => a - b);
    const first = pageTokens.find((token) => token.index === sorted[0]);
    const occurrence = first?.occurrence ?? 0;
    const anchor = rangeAnchor ?? { x: 0, y: 0, width: 0, height: 0 };
    setRangeIndexes(null);
    setRangeAnchor(null);
    selectWord(rangeSpan, occurrence, anchor);
  };

  const playCurrentPage = useCallback(() => {
    const text = pagesRef.current[pageIndexRef.current]?.text ?? "";
    if (!text.trim()) {
      keepListening.current = false;
      setListening(false);
      return;
    }
    setListening(true);
    speakPassage(text, () => {
      if (!keepListening.current) {
        setListening(false);
        return;
      }
      const next = pageIndexRef.current + 1;
      const frame = widthRef.current;
      if (next >= pagesRef.current.length || !frame) {
        keepListening.current = false;
        setListening(false);
        return;
      }
      advancing.current = true;
      pageIndexRef.current = next;
      setPageIndex(next);
      scrollRef.current?.scrollTo({ x: next * frame, animated: true });
    });
  }, []);

  const toggleListen = () => {
    if (keepListening.current) {
      keepListening.current = false;
      stopSpeech();
      setListening(false);
      return;
    }
    if (!(pages[pageIndex]?.text ?? "").trim()) return;
    keepListening.current = true;
    playCurrentPage();
  };

  useEffect(() => {
    return () => {
      keepListening.current = false;
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    if (advancing.current) {
      advancing.current = false;
      if (keepListening.current) playCurrentPage();
      return;
    }
    if (!keepListening.current) return;
    keepListening.current = false;
    stopSpeech();
    setListening(false);
  }, [pageIndex, playCurrentPage]);

  const dismissFromScroll = () => {
    if (Date.now() - openedAt.current < 400) return;
    setSelection(null);
    setRangeIndexes(null);
    setRangeAnchor(null);
  };

  const pageTokens = useMemo(() => {
    const text = pages[pageIndex]?.text ?? "";
    return tokenizePageText(text, vaultWords);
  }, [pageIndex, pages, vaultWords]);

  const rangeSpan = useMemo(() => {
    if (!rangeIndexes?.length) return "";
    return spanFromIndexes(pageTokens, rangeIndexes);
  }, [pageTokens, rangeIndexes]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!settled || !width) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    const clamped = Math.min(Math.max(next, 0), Math.max(pages.length - 1, 0));
    if (clamped !== pageIndexRef.current) {
      setSelection(null);
      setRangeIndexes(null);
      setRangeAnchor(null);
    }
    pageIndexRef.current = clamped;
    setPageIndex(clamped);
  };

  const saved = selection ? findSavedReadingWord(foundWords, vaults, selection.clean) : null;

  const openEdit = () => {
    if (!chapter?.canEdit) return;
    keepListening.current = false;
    stopSpeech();
    setListening(false);
    setSelection(null);
    setRangeIndexes(null);
    setRangeAnchor(null);
    setEditTitle(chapter.title);
    setEditContent(chapter.content);
    setEditing(true);
  };

  const closeEdit = () => {
    if (savingEdit) return;
    setEditing(false);
  };

  const saveEdit = async () => {
    if (!chapter?.canEdit || savingEdit) return;
    const title = editTitle.trim();
    const content = formatChapterContent(editContent);
    if (!title || !content) return;
    setEditTitle(title);
    setEditContent(content);
    setSavingEdit(true);
    setError(null);
    try {
      const updated = await request<{ title: string; content: string }>(`/chapters/${chapterId}`, {
        method: "PATCH",
        body: JSON.stringify({ title, content }),
      });
      const nextContent = formatChapterContent(updated.content ?? content);
      const nextTitle = updated.title ?? title;
      const nextPages = paginateReading(nextContent);
      const nextIndex = Math.min(pageIndexRef.current, Math.max(nextPages.length - 1, 0));
      pageIndexRef.current = nextIndex;
      setPageIndex(nextIndex);
      setChapter((current) =>
        current ? { ...current, title: nextTitle, content: nextContent } : current
      );
      setEditing(false);
      if (width) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ x: nextIndex * width, animated: false });
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar o capítulo");
    } finally {
      setSavingEdit(false);
    }
  };

  if (!hydrated) return <Loading />;

  const progress = pages.length <= 1 ? 1 : pageIndex / (pages.length - 1);

  return (
    <Screen safeBottom>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fechar">
          <Ionicons name="close" size={26} color={theme.colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.colors.border }}>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: theme.colors.green,
            }}
          />
        </View>
        {chapter?.canEdit ? (
          <Pressable onPress={openEdit} hitSlop={10} accessibilityRole="button" accessibilityLabel="Editar capítulo">
            <Ionicons name="create-outline" size={22} color={theme.colors.foreground} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() =>
            setFontSize((current) => FONT_SIZES[(FONT_SIZES.indexOf(current) + 1) % FONT_SIZES.length])
          }
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Tamanho do texto"
        >
          <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 18, letterSpacing: -1 }}>
            TT
          </Text>
        </Pressable>
      </View>
      {error ? <ErrorText>{error}</ErrorText> : null}
      {missing ? (
        <Text style={{ marginTop: 24, color: theme.colors.mutedForeground, fontFamily: theme.fonts.regular }}>
          Capítulo não encontrado.
        </Text>
      ) : (
        <View
          style={{ flex: 1, marginTop: 16 }}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        >
          {width > 0 ? (
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScrollEnd}
              onScrollBeginDrag={() => {
                if (!keepListening.current) return;
                keepListening.current = false;
                stopSpeech();
                setListening(false);
              }}
              scrollEventThrottle={16}
              style={{ width, flex: 1 }}
              snapToInterval={width}
              snapToAlignment="start"
              disableIntervalMomentum
            >
              {pages.map((page, index) => (
                <View key={index} style={{ width, height: "100%" }}>
                  <ScrollView
                    nestedScrollEnabled
                    onScrollBeginDrag={dismissFromScroll}
                    contentContainerStyle={{ paddingBottom: 24 }}
                  >
                    {index === 0 && chapter ? (
                      <ReadingIntro bookTitle={chapter.bookTitle} chapterTitle={chapter.title} bookId={chapter.bookId} />
                    ) : null}
                    <ReadingPageText
                      text={page.text}
                      width={width}
                      fontSize={fontSize}
                      vaultWords={vaultWords}
                      vaultPhrases={vaultPhrases}
                      selectedClean={index === pageIndex ? (selection?.clean ?? null) : null}
                      selectedOccurrence={index === pageIndex ? (selection?.occurrence ?? null) : null}
                      rangeIndexes={index === pageIndex ? rangeIndexes : null}
                      onSelectWord={selectWord}
                      onLongPressWord={beginRange}
                      onToggleRangeWord={toggleRange}
                    />
                  </ScrollView>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      )}
      {chapter && pages.length > 0 ? (
        rangeIndexes ? (
          <View
            style={{
              marginTop: 8,
              borderRadius: 20,
              backgroundColor: shell.tabBar,
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{ color: shell.foreground, fontFamily: theme.fonts.bold, fontSize: 15 }}
              >
                {rangeSpan || "…"}
              </Text>
              <Text style={{ marginTop: 2, color: shell.muted, fontFamily: theme.fonts.medium, fontSize: 12 }}>
                {rangeIndexes.length}/{MAX_RANGE_WORDS} · toque nas vizinhas
              </Text>
            </View>
            <Pressable
              onPress={cancelRange}
              hitSlop={8}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: shell.chip,
              }}
            >
              <Text style={{ color: shell.chipText, fontFamily: theme.fonts.semibold, fontSize: 13 }}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={confirmRange}
              hitSlop={8}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: shell.tones.green,
              }}
            >
              <Text style={{ color: shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 13 }}>Abrir</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 8 }}>
            <Pressable
              onPress={toggleListen}
              disabled={!(pages[pageIndex]?.text ?? "").trim()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={listening ? "Pausar leitura" : "Ouvir esta página"}
              style={{ flex: 1, alignItems: "flex-start", minWidth: 56 }}
            >
              <Ionicons
                name={listening ? "pause" : "headset-outline"}
                size={26}
                color={listening ? theme.colors.green : theme.colors.foreground}
              />
            </Pressable>
            <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.semibold }}>
              {pageIndex + 1} / {pages.length}
            </Text>
            <Pressable
              onPress={() => setWordsOpen(true)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={`${listedWords.length} palavras salvas neste livro`}
              style={{ flex: 1, alignItems: "flex-end", minWidth: 56 }}
            >
              <View>
                <Ionicons name="list-outline" size={26} color={theme.colors.foreground} />
                <View
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -10,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    paddingHorizontal: 4,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: theme.colors.green,
                  }}
                >
                  <Text style={{ color: "#ffffff", fontFamily: theme.fonts.bold, fontSize: 10 }}>
                    {listedWords.length}
                  </Text>
                </View>
              </View>
            </Pressable>
          </View>
        )
      ) : null}
      <BookWordsSheet
        open={wordsOpen}
        words={listedWords}
        onClose={() => setWordsOpen(false)}
        onPick={(word) => {
          setWordsOpen(false);
          selectWord(normalizeToken(word.name) || word.name, 0, { x: 0, y: 0, width: 0, height: 0 }, true);
        }}
      />
      {chapter && selection ? (
        <ReadingWordMenu
          clean={selection.clean}
          anchor={selection.anchor}
          sourceText={pages[pageIndex]?.text ?? ""}
          chapterContent={chapter.content}
          pages={pages}
          pageIndex={pageIndex}
          bookTitle={chapter.bookTitle}
          saved={saved}
          vaults={vaults}
          full={selection.full}
          onClose={() => setSelection(null)}
          onChanged={reloadWords}
        />
      ) : null}

      <Modal animationType="fade" transparent visible={editing} onRequestClose={closeEdit}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
        >
          <Pressable style={{ flex: 1, justifyContent: "center", padding: 24 }} onPress={closeEdit}>
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
              <Heading>Editar capítulo</Heading>
              <Field
                autoFocus
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Título do capítulo"
                style={{ marginTop: 12 }}
              />
              <Field
                value={editContent}
                onChangeText={setEditContent}
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
                label={savingEdit ? "Salvando..." : "Salvar alterações"}
                disabled={savingEdit || !editTitle.trim() || !editContent.trim()}
                onPress={() => void saveEdit()}
              />
              <Pressable onPress={closeEdit} style={{ alignItems: "center", marginTop: 14 }}>
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

function wordsSavedInChapter(found: FoundTextWord[]): BookWord[] {
  const rows: BookWord[] = [];
  const seen = new Set<string>();
  for (const item of found) {
    const clean = normalizeToken(item.word);
    if (!clean || seen.has(clean)) continue;
    const vault = item.vaultInfo[0];
    const saved =
      vault?.words.find((entry) => normalizeToken(entry.name) === clean) ?? vault?.words[0];
    if (!saved) continue;
    seen.add(clean);
    rows.push({
      id: saved.id,
      name: saved.name || item.word,
      translations: saved.translations ?? [],
      grammaticalClass: saved.grammaticalClass,
      confidence: saved.confidence,
      meaning: saved.translations?.[0] ?? "",
      sentence: null,
    });
  }
  return rows;
}

type BookWord = {
  id: number;
  name: string;
  translations: string[];
  grammaticalClass: string;
  confidence: number;
  meaning: string;
  sentence: string | null;
};

function BookWordsSheet({
  open,
  words,
  onClose,
  onPick,
}: {
  open: boolean;
  words: BookWord[];
  onClose: () => void;
  onPick: (word: BookWord) => void;
}) {
  const theme = useTheme();
  const ordered = [...words].sort((a, b) => a.name.localeCompare(b.name, "en"));
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
        <Pressable
          onPress={() => undefined}
          style={{
            maxHeight: "72%",
            backgroundColor: theme.colors.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 12,
            paddingBottom: 28,
          }}
        >
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border }} />
          </View>
          <Text
            style={{
              color: theme.colors.foreground,
              fontFamily: theme.fonts.bold,
              fontSize: 20,
              paddingHorizontal: 20,
            }}
          >
            Palavras deste livro
          </Text>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
            {ordered.length === 0 ? (
              <Text
                style={{
                  marginTop: 16,
                  color: theme.colors.mutedForeground,
                  fontFamily: theme.fonts.regular,
                  fontSize: 15,
                  lineHeight: 22,
                }}
              >
                Nenhuma palavra salva neste livro ainda. Toque numa palavra do texto para guardar.
              </Text>
            ) : (
              ordered.map((word) => {
                const level = Math.min(4, Math.max(1, word.confidence || 1));
                return (
                  <Pressable
                    key={word.id}
                    onPress={() => onPick(word)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: LEVEL_COLORS[level - 1],
                      }}
                    >
                      <Text style={{ color: LEVEL_TEXT[level - 1], fontFamily: theme.fonts.bold, fontSize: 11 }}>
                        {level}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 17 }}>
                        {word.name}
                      </Text>
                      <Text
                        style={{
                          marginTop: 2,
                          color: theme.colors.mutedForeground,
                          fontFamily: theme.fonts.regular,
                          fontSize: 14,
                        }}
                      >
                        {word.translations[0] || word.meaning}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ReadingIntro({
  bookTitle,
  chapterTitle,
  bookId,
}: {
  bookTitle: string;
  chapterTitle: string;
  bookId: number;
}) {
  const theme = useTheme();
  const author = bookAuthor(bookTitle);
  const showChapter = chapterTitle.trim().length > 0 && chapterTitle.trim() !== bookTitle.trim();

  return (
    <View style={{ marginBottom: 22 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: "#f6f1e6",
          }}
        >
          <BookArt title={bookTitle} bookId={bookId} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={2}
            style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 16, lineHeight: 20 }}
          >
            {bookTitle}
          </Text>
          {author ? (
            <Text
              numberOfLines={1}
              style={{
                marginTop: 2,
                color: theme.colors.mutedForeground,
                fontFamily: theme.fonts.regular,
                fontSize: 13,
              }}
            >
              {author}
            </Text>
          ) : null}
        </View>
      </View>
      {showChapter ? (
        <Text
          style={{
            marginTop: 20,
            color: theme.colors.foreground,
            fontFamily: theme.fonts.bold,
            fontSize: 22,
            lineHeight: 28,
          }}
        >
          {chapterTitle}
        </Text>
      ) : null}
    </View>
  );
}
