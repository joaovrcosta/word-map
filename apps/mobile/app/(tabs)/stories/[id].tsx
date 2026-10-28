import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { type Href, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View, type GestureResponderEvent } from "react-native";
import { normalizeToken, paginateReading } from "@word-map/shared";
import {
  findSavedReadingWord,
  ReadingWordMenu,
  type FoundTextWord,
  type WordAnchor,
} from "../../../src/features/reading";
import { CloseButton } from "../../../src/features/flashcards/components/lesson-bar";
import { ProgressFill } from "../../../src/features/flashcards/motion";
import { useStudyHeartbeat } from "../../../src/features/study/use-study-heartbeat";
import { StoryComplete } from "../../../src/features/stories/story-complete";
import type { StoryAnswer, StoryCompletion, StoryDetail, StoryStep } from "../../../src/features/stories/types";
import { useSession } from "../../../src/session";
import { speakPassage, speakWord, stopSpeech } from "../../../src/speech";
import { shell, useTheme } from "../../../src/theme";
import type { Vault } from "../../../src/types";
import { ErrorText, Loading, Muted, Screen } from "../../../src/ui";

const AVATAR_TONES = ["cream", "blue", "green", "lilac"] as const;

export default function StoryPlayerScreen() {
  const theme = useTheme();
  const { request } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [story, setStory] = useState<StoryDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [translated, setTranslated] = useState<Record<number, boolean>>({});
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const [answer, setAnswer] = useState<StoryAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<StoryCompletion | null>(null);
  const [runScore, setRunScore] = useState({ correct: 0, total: 0 });
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [foundWords, setFoundWords] = useState<FoundTextWord[]>([]);
  const [selection, setSelection] = useState<{
    clean: string;
    anchor: WordAnchor;
    sourceText: string;
  } | null>(null);

  const { markInteraction } = useStudyHeartbeat({
    kind: "practice",
    enabled: Boolean(story) && !summary && !missing,
  });
  useEffect(() => {
    markInteraction();
  }, [index, markInteraction]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await request(`/stories/${id}/start`, { method: "POST" });
        const next = await request<StoryDetail>(`/stories/${id}`);
        if (!cancelled) setStory(next);
      } catch {
        if (!cancelled) setMissing(true);
      }
    })();
    return () => {
      cancelled = true;
      stopSpeech();
    };
  }, [id, request]);

  const storyText = useMemo(
    () => (story ? story.steps.map((step) => step.text).join("\n\n") : ""),
    [story]
  );

  const reloadWords = useCallback(async () => {
    if (!storyText) return;
    const [found, nextVaults] = await Promise.all([
      request<FoundTextWord[]>("/words/check-text", {
        method: "POST",
        body: JSON.stringify({ content: storyText }),
      }),
      request<Vault[]>("/vaults"),
    ]);
    setFoundWords(found);
    setVaults(nextVaults);
  }, [request, storyText]);

  useEffect(() => {
    if (!storyText) return;
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
  }, [reloadWords, storyText]);

  useEffect(() => {
    if (index === 0) return;
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (!story) return;
    const current = story.steps[index];
    if (!current) return;
    setSpeakingId(current.id);
    const timer = setTimeout(() => {
      speakPassage(current.text, () => setSpeakingId(null), { speaker: current.speaker });
    }, 180);
    return () => clearTimeout(timer);
  }, [index, story]);

  const step = story?.steps[index] ?? null;
  const visible = story?.steps.slice(0, index + 1) ?? [];
  const total = story?.steps.length ?? 0;
  const progress = total === 0 ? 0 : (index + (answer || !step?.challenge ? 1 : 0)) / total;
  const speakers = useMemo(() => speakerPalette(story?.steps ?? []), [story]);
  const pages = useMemo(() => (step ? paginateReading(step.text) : []), [step]);
  const saved = selection ? findSavedReadingWord(foundWords, vaults, selection.clean) : null;

  const pickCount = step?.challenge?.pickCount ?? 1;
  const choiceReady = Boolean(
    step?.challenge?.kind === "CHOICE" && selected.length === Math.max(1, pickCount)
  );
  const canContinue =
    !busy &&
    (!step?.challenge || Boolean(answer) || (step.challenge.kind === "CHOICE" && choiceReady));

  function resetChallenge() {
    stopSpeech();
    setSpeakingId(null);
    setSelected([]);
    setVerdict(null);
    setAnswer(null);
    setError(null);
    setSelection(null);
  }

  async function submit(body: { value?: boolean; optionIds?: number[] }) {
    if (!story || !step || busy || answer) return null;
    setBusy(true);
    setError(null);
    try {
      const result = await request<StoryAnswer>(`/stories/${story.id}/steps/${step.id}/answer`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setAnswer(result);
      setRunScore((current) => ({
        correct: current.correct + (result.correct ? 1 : 0),
        total: current.total + 1,
      }));
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível responder");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!story || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await request<StoryCompletion>(`/stories/${story.id}/complete`, { method: "POST" });
      setSummary(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir");
    } finally {
      setBusy(false);
    }
  }

  async function continueStory() {
    if (!story || !step || busy) return;
    if (step.challenge && !answer) {
      if (step.challenge.kind !== "CHOICE" || !choiceReady) return;
      await submit({ optionIds: selected });
      return;
    }
    if (index + 1 >= story.steps.length) {
      void finish();
      return;
    }
    resetChallenge();
    setIndex((current) => current + 1);
  }

  function openWord(clean: string, sourceText: string, anchor: WordAnchor) {
    const token = normalizeToken(clean) || clean;
    if (!token) return;
    setSelection({ clean: token, sourceText, anchor });
    speakWord(token);
  }

  if (missing) {
    return (
      <Screen>
        <Muted>História não encontrada.</Muted>
      </Screen>
    );
  }
  if (!story) return <Loading />;

  if (summary && story) {
    const challengeCount = Math.max(summary.challengeCount, runScore.total);
    const displaySummary: StoryCompletion = {
      ...summary,
      challengeCount,
      correctCount: runScore.total > 0 ? runScore.correct : summary.correctCount,
    };
    return (
      <Screen padded={false} reserveTabBar={false} safeBottom>
        <StoryComplete
          title={story.title}
          summary={displaySummary}
          onContinue={() => router.replace("/stories" as Href)}
        />
      </Screen>
    );
  }

  if (!step) {
    return (
      <Screen>
        <Muted>Esta história ainda não tem falas.</Muted>
      </Screen>
    );
  }

  return (
    <Screen padded={false} reserveTabBar={false} safeBottom>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingTop: 8 }}>
          <CloseButton onPress={() => router.back()} />
          <View style={{ flex: 1 }}>
            <ProgressFill progress={Math.min(100, Math.max(0, progress * 100))} color={theme.colors.green} height={14} />
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 22,
            paddingBottom: 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => {
              if (speakingId === -1) {
                stopSpeech();
                setSpeakingId(null);
                return;
              }
              setSpeakingId(-1);
              speakPassage(story.title, () => setSpeakingId(null));
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 22, alignSelf: "flex-start" }}
          >
            <Ionicons
              name={speakingId === -1 ? "volume-high" : "volume-medium"}
              size={22}
              color={theme.colors.green}
            />
            <Text
              style={{
                color: theme.shell.foreground,
                fontFamily: theme.fonts.bold,
                fontSize: 22,
                textDecorationLine: "underline",
                textDecorationStyle: "dotted",
              }}
            >
              {story.title}
            </Text>
          </Pressable>

          {visible.map((item, itemIndex) => {
            const current = itemIndex === index;
            return (
              <View key={item.id} style={{ marginBottom: itemIndex === visible.length - 1 ? 0 : 18 }}>
                <ChatBubble
                  step={item}
                  tone={speakers.get(normalizeSpeaker(item.speaker)) ?? "blue"}
                  current={current}
                  showTranslation={Boolean(translated[item.id])}
                  speaking={speakingId === item.id}
                  onToggleTranslation={() =>
                    setTranslated((currentMap) => ({ ...currentMap, [item.id]: !currentMap[item.id] }))
                  }
                  onSpeak={() => {
                    if (speakingId === item.id) {
                      stopSpeech();
                      setSpeakingId(null);
                      return;
                    }
                    setSpeakingId(item.id);
                    speakPassage(item.text, () => setSpeakingId(null), { speaker: item.speaker });
                  }}
                  onWord={(word, anchor) => openWord(word, item.text, anchor)}
                />
              </View>
            );
          })}

          {step.challenge ? (
            <View style={{ marginTop: 22, gap: 12 }}>
              <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 18 }}>
                {step.challenge.prompt}
              </Text>
              {step.challenge.kind === "CHOICE" && pickCount > 1 ? (
                <Text style={{ color: theme.shell.muted, fontFamily: theme.fonts.medium, fontSize: 14 }}>
                  Selecione {pickCount} opções
                </Text>
              ) : null}
              {step.challenge.kind === "TRUE_FALSE" ? (
                <View style={{ gap: 10 }}>
                  {[
                    { label: "Sim, isso mesmo.", value: true },
                    { label: "Não, não é isso.", value: false },
                  ].map((item) => {
                    const chosen = verdict === item.value;
                    const showRight = Boolean(answer && item.value === answer.correctValue);
                    return (
                      <Pressable
                        key={item.label}
                        disabled={Boolean(answer) || busy}
                        onPress={() => {
                          setVerdict(item.value);
                          void submit({ value: item.value });
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          borderRadius: 16,
                          borderWidth: 1.5,
                          borderColor: showRight
                            ? theme.shell.tones.green
                            : chosen
                              ? theme.shell.foreground
                              : theme.shell.line,
                          paddingHorizontal: 14,
                          paddingVertical: 14,
                          backgroundColor: theme.shell.surface,
                        }}
                      >
                        <ChoiceMark active={showRight || chosen} />
                        <Text style={{ flex: 1, color: theme.shell.foreground, fontFamily: theme.fonts.medium, fontSize: 16 }}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {step.challenge.options.map((option) => {
                    const chosen = selected.includes(option.id);
                    const right = Boolean(answer?.correctOptionIds?.includes(option.id));
                    return (
                      <Pressable
                        key={option.id}
                        disabled={Boolean(answer) || busy}
                        onPress={() =>
                          setSelected((current) =>
                            current.includes(option.id)
                              ? current.filter((item) => item !== option.id)
                              : [...current, option.id]
                          )
                        }
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          borderRadius: 16,
                          borderWidth: 1.5,
                          borderColor: right
                            ? theme.shell.tones.green
                            : chosen
                              ? theme.shell.foreground
                              : theme.shell.line,
                          paddingHorizontal: 14,
                          paddingVertical: 14,
                          backgroundColor: theme.shell.surface,
                        }}
                      >
                        <ChoiceMark active={right || chosen} />
                        <Text style={{ flex: 1, color: theme.shell.foreground, fontFamily: theme.fonts.medium, fontSize: 16 }}>
                          {option.text}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          {error ? <ErrorText>{error}</ErrorText> : null}
        </ScrollView>

        {answer ? (
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 14,
              backgroundColor: answer.correct ? "rgba(201, 242, 196, 0.14)" : "rgba(255, 138, 138, 0.12)",
              borderTopWidth: 1,
              borderTopColor: answer.correct ? theme.shell.tones.green : theme.shell.dangerOnDark,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: answer.correct ? theme.shell.tones.green : theme.shell.dangerOnDark,
                }}
              >
                <Ionicons
                  name={answer.correct ? "checkmark" : "close"}
                  size={18}
                  color={answer.correct ? theme.shell.onPastel : theme.shell.background}
                />
              </View>
              <Text
                style={{
                  color: answer.correct ? theme.shell.tones.green : theme.shell.dangerOnDark,
                  fontFamily: theme.fonts.bold,
                  fontSize: 22,
                }}
              >
                {answer.correct ? "Excelente!" : "Quase!"}
              </Text>
            </View>
            <Pressable
              disabled={busy}
              onPress={() => void continueStory()}
              style={{
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                backgroundColor: answer.correct ? theme.shell.tones.green : theme.shell.dangerOnDark,
              }}
            >
              <Text
                style={{
                  color: answer.correct ? theme.shell.onPastel : theme.shell.background,
                  fontFamily: theme.fonts.bold,
                  fontSize: 17,
                  letterSpacing: 0.6,
                }}
              >
                {busy ? "..." : "CONTINUAR"}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, paddingBottom: 14, paddingTop: 10 }}>
            <Pressable
              disabled={!canContinue}
              onPress={() => void continueStory()}
              style={{
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
                backgroundColor: canContinue ? theme.shell.tones.green : theme.shell.chip,
              }}
            >
              <Text
                style={{
                  color: canContinue ? theme.shell.onPastel : theme.shell.muted,
                  fontFamily: theme.fonts.bold,
                  fontSize: 17,
                  letterSpacing: 0.6,
                }}
              >
                {busy ? "..." : "CONTINUAR"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {selection ? (
        <ReadingWordMenu
          clean={selection.clean}
          anchor={selection.anchor}
          sourceText={selection.sourceText}
          chapterContent={storyText}
          pages={pages}
          pageIndex={0}
          bookTitle={story.title}
          saved={saved}
          vaults={vaults}
          onClose={() => setSelection(null)}
          onChanged={reloadWords}
        />
      ) : null}
    </Screen>
  );
}

function ChoiceMark({ active }: { active: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: active ? theme.shell.foreground : theme.shell.muted,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? theme.shell.foreground : "transparent",
      }}
    >
      {active ? <Ionicons name="checkmark" size={14} color={theme.shell.background} /> : null}
    </View>
  );
}

function ChatBubble({
  step,
  tone,
  current,
  showTranslation,
  speaking,
  onToggleTranslation,
  onSpeak,
  onWord,
}: {
  step: StoryStep;
  tone: (typeof AVATAR_TONES)[number];
  current: boolean;
  showTranslation: boolean;
  speaking: boolean;
  onToggleTranslation: () => void;
  onSpeak: () => void;
  onWord: (word: string, anchor: WordAnchor) => void;
}) {
  const theme = useTheme();
  const name = step.speaker?.trim() || "Narrador";
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
        opacity: current ? 1 : 0.95,
        alignSelf: "stretch",
        flexGrow: 0,
        flexShrink: 0,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: shell.tones[tone],
          borderWidth: 2,
          borderColor: theme.shell.line,
        }}
      >
        <Text style={{ color: shell.onPastel, fontFamily: theme.fonts.bold, fontSize: 18 }}>{initial}</Text>
      </View>
      <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 0, maxWidth: "82%" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <View
            style={{
              width: 0,
              height: 0,
              marginBottom: 14,
              borderTopWidth: 7,
              borderBottomWidth: 7,
              borderRightWidth: 10,
              borderTopColor: "transparent",
              borderBottomColor: "transparent",
              borderRightColor: theme.shell.line,
            }}
          />
          <View
            style={{
              flexGrow: 1,
              flexShrink: 1,
              minWidth: 0,
              marginLeft: -1,
              borderRadius: 16,
              borderBottomLeftRadius: 4,
              paddingHorizontal: 12,
              paddingVertical: 12,
              backgroundColor: theme.shell.surface,
              borderWidth: 2,
              borderColor: theme.shell.line,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <Pressable accessibilityLabel={speaking ? "Parar" : "Ouvir"} onPress={onSpeak} hitSlop={8} style={{ marginTop: 2 }}>
                <Ionicons name={speaking ? "volume-high" : "volume-medium"} size={20} color={theme.colors.green} />
              </Pressable>
              <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
                <StoryLine text={step.text} onWord={onWord} />
                {showTranslation ? (
                  <Text
                    style={{
                      marginTop: 8,
                      color: theme.shell.muted,
                      fontFamily: theme.fonts.medium,
                      fontSize: 14,
                      lineHeight: 20,
                    }}
                  >
                    {step.translation}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
        {current ? (
          <Pressable onPress={onToggleTranslation} hitSlop={6} style={{ alignSelf: "flex-start", marginTop: 8 }}>
            <Text style={{ color: theme.colors.green, fontFamily: theme.fonts.bold, fontSize: 13 }}>
              {showTranslation ? "Ocultar" : "Traduzir"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function StoryLine({
  text,
  onWord,
}: {
  text: string;
  onWord: (word: string, anchor: WordAnchor) => void;
}) {
  const theme = useTheme();
  const parts = text.split(/([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ''-]*)/);
  return (
    <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 17, lineHeight: 24 }}>
      {parts.map((part, index) => {
        const word = /^[A-Za-zÀ-ÖØ-öø-ÿ]/.test(part);
        if (!word) return <Text key={index}>{part}</Text>;
        return <StoryWord key={index} word={part} onWord={onWord} />;
      })}
    </Text>
  );
}

function StoryWord({
  word,
  onWord,
}: {
  word: string;
  onWord: (word: string, anchor: WordAnchor) => void;
}) {
  const theme = useTheme();
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
      const measured = width > 0 && height > 0 && height < 56 && width < 280;
      onWord(word, measured ? { x, y, width, height } : fallback);
    });
  };

  return (
    <Text
      ref={coreRef}
      suppressHighlighting
      onPress={open}
      style={{
        color: theme.shell.foreground,
        fontFamily: theme.fonts.bold,
        fontSize: 17,
        lineHeight: 24,
        textDecorationLine: "underline",
        textDecorationStyle: "dotted",
      }}
    >
      {word}
    </Text>
  );
}

function normalizeSpeaker(speaker: string | null) {
  return speaker?.trim().toLocaleLowerCase() || "narrador";
}

function speakerPalette(steps: StoryStep[]) {
  const map = new Map<string, (typeof AVATAR_TONES)[number]>();
  let next = 0;
  for (const step of steps) {
    const key = normalizeSpeaker(step.speaker);
    if (map.has(key)) continue;
    map.set(key, AVATAR_TONES[next % AVATAR_TONES.length]!);
    next += 1;
  }
  return map;
}
