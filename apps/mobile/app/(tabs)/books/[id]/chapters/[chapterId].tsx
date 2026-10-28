import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  InteractionManager,
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
  estimateWrappedTextHeight,
  formatChapterContent,
  normalizeReadingPosition,
  normalizeToken,
  paginateReadingToFit,
  type ReadingPage,
} from "@word-map/shared";
import {
  EMPTY_FOUND,
  findSavedReadingWord,
  MAX_RANGE_WORDS,
  nextRangeIndexes,
  PageSlot,
  ReadingWordMenu,
  spanFromIndexes,
  tokenizePageText,
  type FoundTextWord,
  type WordAnchor,
} from "../../../../../src/features/reading";
import { useStudyHeartbeat } from "../../../../../src/features/study/use-study-heartbeat";
import { speakPassage, speakWord, stopSpeech } from "../../../../../src/speech";
import { useSession } from "../../../../../src/session";
import { shell, useTheme } from "../../../../../src/theme";
import { type ChapterDetail, type ReadingPosition, type Vault } from "../../../../../src/types";
import { ErrorText, Field, Heading, Loading, PrimaryButton, Screen } from "../../../../../src/ui";

const FONT_SIZES = [18, 22, 26];
const LEVEL_COLORS = ["#ff4b4b", "#ff9600", "#ffc800", "#24c875"];
const LEVEL_TEXT = ["#ffffff", "#ffffff", "#3c3c3c", "#ffffff"];
const WINDOW_RADIUS = 1;
const WORDS_DEFER_MS = 300;
/** Reserva inicial do ReadingIntro (capa + título) até o onLayout real. */
const INTRO_HEIGHT_GUESS = 148;
/** Folga contra padding de highlights / arredondamento da estimativa. */
const FIT_HEIGHT_MARGIN = 28;

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
  const [windowIndex, setWindowIndex] = useState(0);
  const [pages, setPages] = useState<ReadingPage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [fontSize, setFontSize] = useState(FONT_SIZES[0]);
  const [width, setWidth] = useState(0);
  const [frameHeight, setFrameHeight] = useState(0);
  const [introHeight, setIntroHeight] = useState(INTRO_HEIGHT_GUESS);
  const [settled, setSettled] = useState(false);
  const [foundWords, setFoundWords] = useState<FoundTextWord[]>([]);
  const [bookWords, setBookWords] = useState<BookWord[]>([]);
  const [wordsOpen, setWordsOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [editing, setEditing] = useState(false);
  const { markInteraction } = useStudyHeartbeat({
    kind: "reading",
    enabled: hydrated && settled && !editing,
  });
  useEffect(() => {
    markInteraction();
  }, [pageIndex, markInteraction]);
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
  const windowIndexRef = useRef(0);
  const pagesRef = useRef<ReadingPage[]>([]);
  const widthRef = useRef(0);
  const keepListening = useRef(false);
  const advancing = useRef(false);
  const openedAt = useRef(0);
  const wordsRequestId = useRef(0);
  const progressAnchor = useRef({ paragraphIndex: 0, pageIndex: 0 });
  const fitKeyRef = useRef("");
  pagesRef.current = pages;
  widthRef.current = width;

  const lineHeight = Math.round(fontSize * 1.5);

  const buildFittedPages = useCallback(
    (content: string, pageWidth: number, pageHeight: number, intro: number): ReadingPage[] => {
      if (!content.trim() || pageWidth < 40 || pageHeight < 80) {
        return [{ text: content.trim() ? content : "", wordCount: 0, slices: [] }];
      }
      return paginateReadingToFit(content, (sample, pageOrdinal) => {
        const reserve = pageOrdinal === 0 ? intro : 0;
        const budget = pageHeight - reserve - FIT_HEIGHT_MARGIN;
        if (budget < lineHeight * 2) return false;
        return estimateWrappedTextHeight(sample, pageWidth, fontSize, lineHeight) <= budget;
      });
    },
    [fontSize, lineHeight]
  );

  const applyPages = useCallback(
    (nextPages: ReadingPage[], preferAnchor = true) => {
      const anchor = preferAnchor
        ? progressAnchor.current
        : {
            paragraphIndex: pagesRef.current[pageIndexRef.current]?.slices[0]?.paragraphIndex ?? 0,
            pageIndex: pageIndexRef.current,
          };
      const position = normalizeReadingPosition(
        nextPages,
        anchor.paragraphIndex,
        anchor.pageIndex
      );
      progressAnchor.current = {
        paragraphIndex: position.paragraphIndex,
        pageIndex: position.pageIndex,
      };
      pageIndexRef.current = position.pageIndex;
      windowIndexRef.current = position.pageIndex;
      setPageIndex(position.pageIndex);
      setWindowIndex(position.pageIndex);
      setPages(nextPages);
    },
    []
  );

  const syncPage = useCallback((next: number, clearSelection = true) => {
    const clamped = Math.min(Math.max(next, 0), Math.max(pagesRef.current.length - 1, 0));
    if (clearSelection && clamped !== pageIndexRef.current) {
      setSelection(null);
      setRangeIndexes(null);
      setRangeAnchor(null);
    }
    pageIndexRef.current = clamped;
    setPageIndex(clamped);
    const page = pagesRef.current[clamped];
    progressAnchor.current = {
      paragraphIndex: page?.slices[0]?.paragraphIndex ?? progressAnchor.current.paragraphIndex,
      pageIndex: clamped,
    };
    if (windowIndexRef.current !== clamped) {
      windowIndexRef.current = clamped;
      setWindowIndex(clamped);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSettled(false);
    setHydrated(false);
    setMissing(false);
    setError(null);
    setFoundWords([]);
    setBookWords([]);
    setPages([]);
    setIntroHeight(INTRO_HEIGHT_GUESS);
    fitKeyRef.current = "";
    setSelection(null);
    setRangeIndexes(null);
    setRangeAnchor(null);
    if (__DEV__) console.time("chapter-first-paint");
    (async () => {
      try {
        const [detail, progress] = await Promise.all([
          request<ChapterDetail | null>(`/chapters/${chapterId}`),
          request<ReadingPosition | null>(`/chapters/${chapterId}/progress`),
        ]);
        if (cancelled) return;
        if (!detail) {
          setMissing(true);
          setPages([]);
          setChapter(null);
          setHydrated(true);
          return;
        }
        progressAnchor.current = {
          paragraphIndex: progress?.paragraphIndex ?? 0,
          pageIndex: progress?.pageIndex ?? 0,
        };
        setChapter(detail);
        setHydrated(true);
        if (__DEV__) console.timeEnd("chapter-first-paint");
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "Não foi possível abrir o capítulo");
        setHydrated(true);
        if (__DEV__) console.timeEnd("chapter-first-paint");
      }
    })();
    return () => {
      cancelled = true;
      wordsRequestId.current += 1;
    };
  }, [chapterId, request]);

  useEffect(() => {
    if (!hydrated || !chapter || width < 40 || frameHeight < 80) return;
    const key = `${chapter.id}:${width}x${frameHeight}:${fontSize}:${introHeight}`;
    if (fitKeyRef.current === key) return;
    fitKeyRef.current = key;
    const nextPages = buildFittedPages(chapter.content, width, frameHeight, introHeight);
    applyPages(nextPages, true);
  }, [hydrated, chapter, width, frameHeight, fontSize, introHeight, buildFittedPages, applyPages]);

  useEffect(() => {
    if (!hydrated || !width || pages.length === 0) return;
    scrollRef.current?.scrollTo({ x: pageIndexRef.current * width, animated: false });
    setSettled(true);
  }, [hydrated, width, pages]);

  const reloadWords = useCallback(
    async (requestId?: number) => {
      if (!chapter) return;
      const id = requestId ?? ++wordsRequestId.current;
      try {
        const [found, nextVaults] = await Promise.all([
          request<FoundTextWord[]>("/words/check-text", {
            method: "POST",
            body: JSON.stringify({ content: chapter.content }),
          }),
          request<Vault[]>("/vaults"),
        ]);
        if (id !== wordsRequestId.current) return;
        setFoundWords(found);
        setVaults(nextVaults);
        try {
          const savedInBook = await request<BookWord[]>(
            `/words/by-book?title=${encodeURIComponent(chapter.bookTitle)}`
          );
          if (id !== wordsRequestId.current) return;
          setBookWords(Array.isArray(savedInBook) ? savedInBook : []);
        } catch {
          if (id !== wordsRequestId.current) return;
          setBookWords([]);
        }
      } catch {
        if (id !== wordsRequestId.current) return;
        setFoundWords([]);
        setVaults([]);
        setBookWords([]);
      }
    },
    [chapter, request]
  );

  useEffect(() => {
    if (!settled || !chapter) return;
    let cancelled = false;
    let ran = false;
    const run = () => {
      if (cancelled || ran) return;
      ran = true;
      const id = ++wordsRequestId.current;
      void reloadWords(id);
    };
    const interaction = InteractionManager.runAfterInteractions(run);
    const timeout = setTimeout(run, WORDS_DEFER_MS);
    return () => {
      cancelled = true;
      wordsRequestId.current += 1;
      clearTimeout(timeout);
      interaction.cancel?.();
    };
  }, [settled, chapter, reloadWords]);

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

  const selectWord = useCallback((clean: string, occurrence: number, anchor: WordAnchor, full = false) => {
    openedAt.current = Date.now();
    keepListening.current = false;
    setListening(false);
    setRangeIndexes(null);
    setRangeAnchor(null);
    setSelection({ clean, occurrence, anchor, full });
    speakWord(clean);
  }, []);

  const beginRange = useCallback(
    (clean: string, occurrence: number, anchor: WordAnchor, tokenIndex: number) => {
      openedAt.current = Date.now();
      keepListening.current = false;
      setListening(false);
      setSelection(null);
      setRangeIndexes([tokenIndex]);
      setRangeAnchor(anchor);
      softTapHaptic();
      speakWord(clean);
    },
    []
  );

  const toggleRange = useCallback((tokenIndex: number, _clean: string, _occurrence: number, anchor: WordAnchor) => {
    setRangeIndexes((prev) => {
      const current = prev ?? [];
      const next = nextRangeIndexes(current, tokenIndex, MAX_RANGE_WORDS);
      if (next.length > current.length) softTapHaptic();
      return next;
    });
    setRangeAnchor(anchor);
  }, []);

  const cancelRange = () => {
    setRangeIndexes(null);
    setRangeAnchor(null);
  };

  const pageTokens = useMemo(() => {
    const text = pages[pageIndex]?.text ?? "";
    const vaultWords = new Set(
      foundWords
        .map((item) => normalizeToken(item.word))
        .filter((word) => word && !word.includes(" "))
    );
    return tokenizePageText(text, vaultWords);
  }, [foundWords, pageIndex, pages]);

  const rangeSpan = useMemo(() => {
    if (!rangeIndexes?.length) return "";
    return spanFromIndexes(pageTokens, rangeIndexes);
  }, [pageTokens, rangeIndexes]);

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
      syncPage(next, false);
      scrollRef.current?.scrollTo({ x: next * frame, animated: true });
    });
  }, [syncPage]);

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

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!settled || !width) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    const clamped = Math.min(Math.max(next, 0), Math.max(pagesRef.current.length - 1, 0));
    if (windowIndexRef.current !== clamped) {
      windowIndexRef.current = clamped;
      setWindowIndex(clamped);
    }
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!settled || !width) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    syncPage(next);
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
      fitKeyRef.current = "";
      setChapter((current) =>
        current ? { ...current, title: nextTitle, content: nextContent } : current
      );
      if (width >= 40 && frameHeight >= 80) {
        const nextPages = buildFittedPages(nextContent, width, frameHeight, introHeight);
        applyPages(nextPages, false);
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ x: pageIndexRef.current * width, animated: false });
        });
      }
      setEditing(false);
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
          style={{ flex: 1, marginTop: 16, overflow: "hidden" }}
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            const nextHeight = event.nativeEvent.layout.height;
            setWidth((current) => (Math.abs(current - nextWidth) <= 1 ? current : nextWidth));
            setFrameHeight((current) =>
              Math.abs(current - nextHeight) <= 1 ? current : nextHeight
            );
          }}
        >
          {width > 0 && frameHeight > 0 && pages.length > 0 ? (
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              onMomentumScrollEnd={onScrollEnd}
              onScrollBeginDrag={() => {
                dismissFromScroll();
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
              {pages.map((page, index) => {
                const active = Math.abs(index - windowIndex) <= WINDOW_RADIUS;
                return (
                  <View key={index} style={{ width, height: frameHeight, overflow: "hidden" }}>
                    {index === 0 && chapter ? (
                      <View
                        onLayout={(event) => {
                          const next = Math.ceil(event.nativeEvent.layout.height);
                          setIntroHeight((current) =>
                            Math.abs(current - next) <= 2 ? current : next
                          );
                        }}
                      >
                        <ReadingIntro
                          bookTitle={chapter.bookTitle}
                          chapterTitle={chapter.title}
                          bookId={chapter.bookId}
                        />
                      </View>
                    ) : null}
                    <PageSlot
                      text={page.text}
                      active={active}
                      width={width}
                      fontSize={fontSize}
                      foundWords={active ? foundWords : EMPTY_FOUND}
                      selectedClean={index === pageIndex ? (selection?.clean ?? null) : null}
                      selectedOccurrence={index === pageIndex ? (selection?.occurrence ?? null) : null}
                      rangeIndexes={index === pageIndex ? rangeIndexes : null}
                      onSelectWord={selectWord}
                      onLongPressWord={beginRange}
                      onToggleRangeWord={toggleRange}
                    />
                  </View>
                );
              })}
            </ScrollView>
          ) : hydrated && chapter ? (
            <Loading />
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
          onChanged={async () => {
            await reloadWords(++wordsRequestId.current);
          }}
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
