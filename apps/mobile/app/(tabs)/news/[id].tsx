import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { type Href, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { paginateReading, normalizeToken } from "@word-map/shared";
import {
  Image,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type TextStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  findSavedReadingWord,
  ReadingWordMenu,
  type FoundTextWord,
  type WordAnchor,
} from "../../../src/features/reading";
import { formatNewsDate } from "../../../src/features/news/format";
import type { NewsDetail } from "../../../src/features/news/types";
import { useStudyHeartbeat } from "../../../src/features/study/use-study-heartbeat";
import { useSession } from "../../../src/session";
import { speakWord } from "../../../src/speech";
import { useTheme } from "../../../src/theme";
import type { Vault } from "../../../src/types";
import { ErrorText, Loading } from "../../../src/ui";

function formatListen(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")} min`;
}

export default function NewsDetailScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { request } = useSession();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const [article, setArticle] = useState<NewsDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [foundWords, setFoundWords] = useState<FoundTextWord[]>([]);
  const [selection, setSelection] = useState<{
    clean: string;
    anchor: WordAnchor;
    sourceText: string;
  } | null>(null);

  const articleText = useMemo(
    () => (article ? [article.title, article.summary, article.body].filter(Boolean).join("\n\n") : ""),
    [article]
  );
  const pages = useMemo(() => (articleText ? paginateReading(articleText) : []), [articleText]);
  const saved = selection ? findSavedReadingWord(foundWords, vaults, selection.clean) : null;
  const vaultWords = useMemo(
    () =>
      new Set(
        foundWords
          .map((item) => normalizeToken(item.word))
          .filter((word) => word && !word.includes(" "))
      ),
    [foundWords]
  );

  useStudyHeartbeat({
    kind: "reading",
    enabled: Boolean(article),
  });

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) {
      setError("Notícia inválida");
      return;
    }
    try {
      const next = await request<NewsDetail>(`/news/${id}`);
      setArticle(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar a notícia");
    }
  }, [id, request]);

  const reloadWords = useCallback(async () => {
    if (!articleText) return;
    const [found, nextVaults] = await Promise.all([
      request<FoundTextWord[]>("/words/check-text", {
        method: "POST",
        body: JSON.stringify({ content: articleText }),
      }),
      request<Vault[]>("/vaults"),
    ]);
    setFoundWords(found);
    setVaults(nextVaults);
  }, [articleText, request]);

  useEffect(() => {
    void load();
    return () => {
      Speech.stop();
    };
  }, [load]);

  useEffect(() => {
    if (!articleText) return;
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
  }, [articleText, reloadWords]);

  const stopListening = useCallback(() => {
    Speech.stop();
    setListening(false);
  }, []);

  const toggleListen = useCallback(() => {
    if (!article) return;
    if (listening) {
      stopListening();
      return;
    }
    const text = `${article.title}. ${article.summary}. ${article.body}`;
    setListening(true);
    Speech.speak(text, {
      language: "en-US",
      onDone: () => setListening(false),
      onStopped: () => setListening(false),
      onError: () => setListening(false),
    });
  }, [article, listening, stopListening]);

  const shareArticle = useCallback(async () => {
    if (!article) return;
    await Share.share({
      message: `${article.title}\n\n${article.summary}`,
    });
  }, [article]);

  function openWord(clean: string, sourceText: string, anchor: WordAnchor) {
    const token = normalizeToken(clean) || clean;
    if (!token) return;
    setSelection({ clean: token, sourceText, anchor });
    speakWord(token);
  }

  if (!article && !error) return <Loading />;
  if (error || !article) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 20, paddingTop: insets.top + 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={theme.shell.foreground} />
        </Pressable>
        <ErrorText>{error ?? "Notícia não encontrada"}</ErrorText>
      </View>
    );
  }

  const imageHeight = Math.round(width * 0.72);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: 28 + insets.bottom + 64,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 16, alignItems: "center" }}
          style={{ maxHeight: 36 }}
        >
          <Text
            style={{
              color: theme.shell.foreground,
              fontFamily: theme.fonts.bold,
              fontSize: 13,
            }}
          >
            {article.section}
          </Text>
          {article.tags.map((tag) => (
            <Text
              key={tag}
              style={{
                color: theme.shell.muted,
                fontFamily: theme.fonts.medium,
                fontSize: 13,
              }}
            >
              {tag}
            </Text>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <NewsLine
            text={article.title}
            vaultWords={vaultWords}
            selectedClean={selection?.clean ?? null}
            onWord={(word, anchor) => openWord(word, article.title, anchor)}
            style={{
              color: theme.shell.foreground,
              fontFamily: theme.fonts.serifItalic,
              fontSize: 34,
              lineHeight: 42,
            }}
          />
          {formatNewsDate(article.publishedAt) ? (
            <Text
              style={{
                marginTop: 12,
                color: theme.shell.muted,
                fontFamily: theme.fonts.medium,
                fontSize: 13,
              }}
            >
              {formatNewsDate(article.publishedAt)}
            </Text>
          ) : null}
          <View style={{ marginTop: 18 }}>
            <NewsLine
              text={article.summary}
              vaultWords={vaultWords}
              selectedClean={selection?.clean ?? null}
              onWord={(word, anchor) => openWord(word, article.summary, anchor)}
              style={{
                color: theme.shell.foreground,
                fontFamily: theme.fonts.serif,
                fontSize: 17,
                lineHeight: 26,
              }}
            />
          </View>

          <Pressable
            onPress={toggleListen}
            accessibilityRole="button"
            accessibilityLabel={listening ? "Parar áudio" : "Ouvir notícia"}
            style={{ marginTop: 22, flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                borderWidth: 1.5,
                borderColor: theme.shell.foreground,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={listening ? "pause" : "play"}
                size={16}
                color={theme.shell.foreground}
                style={listening ? undefined : { marginLeft: 2 }}
              />
            </View>
            <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.medium, fontSize: 15 }}>
              {listening ? "Parar" : "Listen"} · {formatListen(article.listenSeconds)}
            </Text>
          </Pressable>
        </View>

        {article.imageUrl ? (
          <View style={{ marginTop: 24 }}>
            <Image
              source={{ uri: article.imageUrl }}
              style={{ width, height: imageHeight }}
              resizeMode="cover"
            />
            {article.imageCaption ? (
              <Text
                style={{
                  marginTop: 10,
                  paddingHorizontal: 20,
                  color: theme.shell.muted,
                  fontFamily: theme.fonts.serif,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {article.imageCaption}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 20, marginTop: 28, gap: 18 }}>
          {article.body
            .split(/\n+/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
            .map((paragraph, index) => (
              <NewsLine
                key={`${index}-${paragraph.slice(0, 12)}`}
                text={paragraph}
                vaultWords={vaultWords}
                selectedClean={selection?.clean ?? null}
                onWord={(word, anchor) => openWord(word, paragraph, anchor)}
                style={{
                  color: theme.shell.foreground,
                  fontFamily: theme.fonts.serif,
                  fontSize: 17,
                  lineHeight: 28,
                }}
              />
            ))}
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 10,
          paddingHorizontal: 18,
          backgroundColor: theme.shell.background,
          borderTopWidth: 1,
          borderTopColor: theme.shell.line,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => {
            stopListening();
            if (router.canGoBack()) router.back();
            else router.replace("/news" as Href);
          }}
          hitSlop={10}
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={24} color={theme.shell.foreground} />
        </Pressable>
        <Pressable onPress={toggleListen} hitSlop={10} accessibilityLabel="Ouvir">
          <Ionicons
            name={listening ? "pause-circle-outline" : "headset-outline"}
            size={24}
            color={theme.shell.foreground}
          />
        </Pressable>
        <Pressable onPress={() => void shareArticle()} hitSlop={10} accessibilityLabel="Compartilhar">
          <Ionicons name="share-outline" size={24} color={theme.shell.foreground} />
        </Pressable>
        <Pressable hitSlop={10} accessibilityLabel="Mais opções">
          <Ionicons name="ellipsis-vertical" size={22} color={theme.shell.foreground} />
        </Pressable>
      </View>

      {selection ? (
        <ReadingWordMenu
          clean={selection.clean}
          anchor={selection.anchor}
          sourceText={selection.sourceText}
          chapterContent={articleText}
          pages={pages}
          pageIndex={0}
          bookTitle={article.title}
          saved={saved}
          vaults={vaults}
          onClose={() => setSelection(null)}
          onChanged={reloadWords}
        />
      ) : null}
    </View>
  );
}

function NewsLine({
  text,
  vaultWords,
  selectedClean,
  onWord,
  style,
}: {
  text: string;
  vaultWords: Set<string>;
  selectedClean: string | null;
  onWord: (word: string, anchor: WordAnchor) => void;
  style: TextStyle;
}) {
  const parts = text.split(/([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ''-]*)/);
  return (
    <Text style={style}>
      {parts.map((part, index) => {
        const word = /^[A-Za-zÀ-ÖØ-öø-ÿ]/.test(part);
        if (!word) return <Text key={index}>{part}</Text>;
        const clean = normalizeToken(part);
        const inVault = Boolean(clean && vaultWords.has(clean));
        const selected = Boolean(clean && selectedClean === clean);
        return (
          <NewsWord
            key={index}
            word={part}
            inVault={inVault}
            selected={selected}
            onWord={onWord}
            style={style}
          />
        );
      })}
    </Text>
  );
}

function NewsWord({
  word,
  inVault,
  selected,
  onWord,
  style,
}: {
  word: string;
  inVault: boolean;
  selected: boolean;
  onWord: (word: string, anchor: WordAnchor) => void;
  style: TextStyle;
}) {
  const coreRef = useRef<ComponentRef<typeof Text>>(null);

  const open = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    const fallback = { x: pageX - 4, y: pageY - 10, width: 8, height: 20 };
    const node = coreRef.current;
    if (!node) {
      onWord(word, fallback);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      const measured = width > 0 && height > 0 && height < 80 && width < 320;
      onWord(word, measured ? { x, y, width, height } : fallback);
    });
  };

  return (
    <Text
      ref={coreRef}
      suppressHighlighting
      onPress={open}
      style={[
        style,
        {
          color: selected ? "#0b1f14" : inVault ? "#7ddea8" : style.color,
          backgroundColor: selected
            ? "#3dd68c"
            : inVault
              ? "rgba(36,200,117,0.28)"
              : "transparent",
          borderRadius: selected || inVault ? 6 : 0,
          overflow: "hidden",
          paddingHorizontal: selected || inVault ? 3 : 0,
          textDecorationLine: inVault || selected ? "none" : "underline",
          textDecorationStyle: "dotted",
        },
      ]}
    >
      {word}
    </Text>
  );
}
