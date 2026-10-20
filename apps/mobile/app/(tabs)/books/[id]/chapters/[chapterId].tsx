import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { normalizeReadingPosition, normalizeToken, paginateReading } from "@word-map/shared";
import {
  findSavedReadingWord,
  ReadingPageText,
  ReadingWordMenu,
  speakWord,
  type FoundTextWord,
  type WordAnchor,
} from "../../../../../src/reading-word-menu";
import { useSession } from "../../../../../src/session";
import { useTheme } from "../../../../../src/theme";
import { type ChapterDetail, type ReadingPosition, type Vault } from "../../../../../src/types";
import { ErrorText, Loading, Screen } from "../../../../../src/ui";

const FONT_SIZES = [18, 22, 26];

export default function ChapterReaderScreen() {
  const theme = useTheme();
  const { request } = useSession();
  const params = useLocalSearchParams<{ id: string; chapterId: string }>();
  const chapterId = Number(params.chapterId);
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [fontSize, setFontSize] = useState(FONT_SIZES[0]);
  const [width, setWidth] = useState(0);
  const [settled, setSettled] = useState(false);
  const [foundWords, setFoundWords] = useState<FoundTextWord[]>([]);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selection, setSelection] = useState<{
    clean: string;
    occurrence: number;
    anchor: WordAnchor;
  } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const pageIndexRef = useRef(0);
  const openedAt = useRef(0);

  const pages = useMemo(
    () => (chapter ? paginateReading(chapter.content) : []),
    [chapter]
  );

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
  }, [chapter, request]);

  useEffect(() => {
    if (!chapter) return;
    let cancelled = false;
    reloadWords().catch(() => {
      if (!cancelled) {
        setFoundWords([]);
        setVaults([]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [chapter, reloadWords]);

  useEffect(() => {
    setSelection(null);
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
    () => new Set(foundWords.map((item) => normalizeToken(item.word))),
    [foundWords]
  );

  const selectWord = (clean: string, occurrence: number, anchor: WordAnchor) => {
    openedAt.current = Date.now();
    setSelection({ clean, occurrence, anchor });
    speakWord(clean);
  };

  const dismissFromScroll = () => {
    if (Date.now() - openedAt.current < 400) return;
    setSelection(null);
  };

  const goTo = (next: number) => {
    if (!width || pages.length === 0) return;
    setSelection(null);
    const clamped = Math.min(Math.max(next, 0), pages.length - 1);
    pageIndexRef.current = clamped;
    setPageIndex(clamped);
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!settled || !width) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    const clamped = Math.min(Math.max(next, 0), Math.max(pages.length - 1, 0));
    if (clamped !== pageIndexRef.current) setSelection(null);
    pageIndexRef.current = clamped;
    setPageIndex(clamped);
  };

  const saved = selection ? findSavedReadingWord(foundWords, vaults, selection.clean) : null;

  if (!hydrated) return <Loading />;

  const progress = pages.length <= 1 ? 1 : pageIndex / (pages.length - 1);

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: theme.colors.greenText, fontFamily: theme.fonts.semibold }}>Voltar</Text>
        </Pressable>
        <Text
          numberOfLines={1}
          style={{ flex: 1, color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 16 }}
        >
          {chapter?.title ?? "Capítulo"}
        </Text>
        <Pressable
          onPress={() =>
            setFontSize((current) => FONT_SIZES[(FONT_SIZES.indexOf(current) + 1) % FONT_SIZES.length])
          }
        >
          <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 16 }}>Aa</Text>
        </Pressable>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.colors.border, marginTop: 12 }}>
        <View
          style={{
            height: 4,
            borderRadius: 2,
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: theme.colors.green,
          }}
        />
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
                    <ReadingPageText
                      text={page.text}
                      width={width}
                      fontSize={fontSize}
                      vaultWords={vaultWords}
                      selectedClean={index === pageIndex ? (selection?.clean ?? null) : null}
                      selectedOccurrence={index === pageIndex ? (selection?.occurrence ?? null) : null}
                      onSelectWord={selectWord}
                    />
                  </ScrollView>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      )}
      {chapter && pages.length > 0 ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8 }}>
          <Pressable onPress={() => goTo(pageIndex - 1)} disabled={pageIndex === 0}>
            <Text
              style={{
                color: pageIndex === 0 ? theme.colors.border : theme.colors.greenText,
                fontFamily: theme.fonts.bold,
              }}
            >
              Anterior
            </Text>
          </Pressable>
          <Text style={{ color: theme.colors.mutedForeground, fontFamily: theme.fonts.semibold }}>
            {pageIndex + 1} / {pages.length}
          </Text>
          <Pressable onPress={() => goTo(pageIndex + 1)} disabled={pageIndex >= pages.length - 1}>
            <Text
              style={{
                color: pageIndex >= pages.length - 1 ? theme.colors.border : theme.colors.greenText,
                fontFamily: theme.fonts.bold,
              }}
            >
              Próxima
            </Text>
          </Pressable>
        </View>
      ) : null}
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
          onClose={() => setSelection(null)}
          onChanged={reloadWords}
        />
      ) : null}
    </Screen>
  );
}
