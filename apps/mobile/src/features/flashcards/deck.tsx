import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import Animated, { SlideInRight, SlideOutLeft } from "react-native-reanimated";
import {
  buildFlashcardQueue,
  buildSpeakQueue,
  challengeXpForStreak,
  isPhraseFlashcard,
  isSingleWordName,
  recognitionRetry,
  selectPracticeWords,
  shouldRecordClozeResult,
  stepWordIds,
  type ClozeSource,
  type FlashcardStep,
  type FlashcardWord,
  type SpeakSentenceSource,
} from "@word-map/shared";
import { ClozeCard } from "./components/cloze-card";
import { ExitConfirm } from "./components/exit-confirm";
import { CloseButton, EnergyMark, StreakChip, streakHeat, XpFloat } from "./components/lesson-bar";
import { ListenCard } from "./components/listen-card";
import { MatchCard } from "./components/match-card";
import { RecallCard } from "./components/recall-card";
import { SpeakCard } from "./components/speak-card";
import { SessionSummary } from "./components/session-summary";
import { cues, isSoundOn, readSoundEnabled, syncSoundEnabled, useLessonCues, writeSoundEnabled } from "./cues";
import { focusFromMarks, practiceLine } from "./lesson-queue";
import { ProgressFill, useMotionEnabled } from "./motion";
import {
  type ChallengeKind,
  type LevelShift,
  type PendingSave,
  type PracticeMark,
  type RawWord,
  type ReviewItem,
  type ReviewKind,
  type StudySession,
} from "./types";
import { toWord } from "./words";
import { flushSaves, writeFocus } from "./saves";
import { useStudyHeartbeat } from "../study/use-study-heartbeat";
import { useSession } from "../../session";
import { isSpeechRecognitionAvailable } from "../../speech-recognition";
import { useTheme } from "../../theme";
import { isSpeakModeLocked } from "./speak-mode";

/** Desliga fala na fila no Expo Go; liberado no APK. */
const SPEAK_MODE_LOCKED = isSpeakModeLocked();






export function FlashcardDeck({
  vaultId,
  onLeave,
  autostart = false,
  mode = "mixed",
}: {
  vaultId?: number;
  onLeave: () => void;
  autostart?: boolean;
  /** `speak` = só exercícios de fala (frases salvas + frases IA). */
  mode?: "mixed" | "speak";
}) {
  const theme = useTheme();
  const motion = useMotionEnabled();
  const { request } = useSession();
  const [words, setWords] = useState<FlashcardWord[]>([]);
  const [vaultName, setVaultName] = useState("");
  const [session, setSession] = useState<StudySession | null>(null);
  const [steps, setSteps] = useState<FlashcardStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [challengeStats, setChallengeStats] = useState({ correct: 0, total: 0 });
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisState, setAnalysisState] = useState<"none" | "loading" | "ready" | "unavailable">("none");
  const [nextPractice, setNextPractice] = useState<string | null>(null);
  const [evolved, setEvolved] = useState<LevelShift[]>([]);
  const [soundOn, setSoundOn] = useState(true);
  const [streak, setStreak] = useState(0);
  const [xpToken, setXpToken] = useState(0);
  const [lastXpGain, setLastXpGain] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [finishing, setFinishing] = useState(false);
  useLessonCues();
  const stepsRef = useRef<FlashcardStep[]>([]);
  const indexRef = useRef(0);
  const studiedIdsRef = useRef(new Set<number>());
  const clozeAttemptsRef = useRef<Map<number, number>>(new Map());
  const outcomesRef = useRef<ReviewItem[]>([]);
  const practiceRef = useRef<PracticeMark[]>([]);
  const reviewTokenRef = useRef(0);
  const pendingSavesRef = useRef<PendingSave[]>([]);
  const levelsRef = useRef<Map<number, { id: number; name: string; start: number; current: number }>>(new Map());
  const streakRef = useRef(0);
  const goalStepsRef = useRef(0);
  const [goalSteps, setGoalSteps] = useState(0);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autostartRef = useRef(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        if (vaultId) {
          try {
            const vault = await request<{ name: string }>(`/flashcards/vaults/${vaultId}`);
            if (alive) setVaultName(vault.name);
          } catch {
            if (alive) setVaultName("");
          }
        } else if (alive) {
          setVaultName(mode === "speak" ? "Fala" : "Treino");
        }
        const flashcardWords = await request<RawWord[]>(
          vaultId ? `/flashcards/vaults/${vaultId}/words` : "/flashcards/words"
        );
        if (!alive) return;
        const mapped = flashcardWords.map(toWord);
        setWords(mapped);
      } catch {
        if (!alive) return;
        setWords([]);
        setLoadError("Não foi possível carregar as palavras.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    void load();
    void readSoundEnabled().then((enabled) => {
      syncSoundEnabled(enabled);
      if (alive) setSoundOn(enabled);
    });
    return () => {
      alive = false;
      if (finishTimerRef.current) {
        clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
    };
  }, [mode, request, vaultId, reloadToken]);

  useEffect(() => {
    if (!isSessionActive) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setConfirmExit((open) => !open);
      return true;
    });
    return () => subscription.remove();
  }, [isSessionActive]);

  useStudyHeartbeat({
    kind: "practice",
    enabled: isSessionActive && !showSummary,
    assumeInteractive: true,
  });

  const syncQueue = (nextSteps: FlashcardStep[], nextIndex: number) => {
    stepsRef.current = nextSteps;
    indexRef.current = nextIndex;
    setSteps(nextSteps);
    setStepIndex(nextIndex);
  };

  const requestClozes = async (wordIds: number[]): Promise<ClozeSource[]> => {
    const unique = [...new Set(wordIds)];
    const saved: ClozeSource[] = [];

    for (let index = 0; index < unique.length; index += 20) {
      const batch = unique.slice(index, index + 20);
      try {
        const data = await request<{ clozes?: unknown }>("/flashcards/cloze", {
          method: "POST",
          body: JSON.stringify({ wordIds: batch }),
        });
        if (!Array.isArray(data.clozes)) continue;
        for (const item of data.clozes) {
          if (!item || typeof item !== "object") continue;
          const wordId = (item as { wordId?: unknown }).wordId;
          const sentence = (item as { sentence?: unknown }).sentence;
          const answer = (item as { answer?: unknown }).answer;
          if (typeof wordId !== "number" || typeof sentence !== "string") continue;
          if (typeof answer !== "string" || !sentence.trim() || !answer.trim()) continue;
          saved.push({ wordId, sentence, answer });
        }
      } catch {
        continue;
      }
    }

    return saved;
  };

  const requestSpeakSentences = async (wordIds: number[]): Promise<SpeakSentenceSource[]> => {
    const unique = [...new Set(wordIds)];
    const saved: SpeakSentenceSource[] = [];

    for (let index = 0; index < unique.length; index += 20) {
      const batch = unique.slice(index, index + 20);
      try {
        const data = await request<{ sentences?: unknown }>("/flashcards/speak-sentences", {
          method: "POST",
          body: JSON.stringify({ wordIds: batch }),
        });
        if (!Array.isArray(data.sentences)) continue;
        for (const item of data.sentences) {
          if (!item || typeof item !== "object") continue;
          const wordId = (item as { wordId?: unknown }).wordId;
          const sentence = (item as { sentence?: unknown }).sentence;
          if (typeof wordId !== "number" || typeof sentence !== "string") continue;
          if (!sentence.trim()) continue;
          saved.push({ wordId, sentence: sentence.trim() });
        }
      } catch {
        continue;
      }
    }

    return saved;
  };

  const leaveLesson = () => {
    Speech.stop();
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    setFinishing(false);
    pendingSavesRef.current = [];
    onLeave();
  };

  const closeSession = (completedWords: number) => {
    Speech.stop();
    setSession((current) =>
      current
        ? {
            ...current,
            endTime: new Date(),
            completedWords,
          }
        : current
    );
    setIsSessionActive(false);
    setEvolved(
      [...levelsRef.current.values()]
        .filter((row) => row.current > row.start)
        .map((row) => ({ id: row.id, name: row.name, from: row.start, to: row.current }))
    );
    setShowSummary(true);
    setShowAnswer(false);
    cues.done();
    void flushSaves(pendingSavesRef.current, request);
    if (practiceRef.current.length > 0) {
      const focus = focusFromMarks(practiceRef.current);
      setNextPractice(practiceLine(focus));
      if (vaultId) void writeFocus(vaultId, focus).catch(() => undefined);
    } else {
      setNextPractice(null);
    }
    const items = outcomesRef.current.slice(0, 40);
    const token = reviewTokenRef.current;
    if (items.length === 0) {
      setAnalysis(null);
      setAnalysisState("none");
      return;
    }
    setAnalysis(null);
    setAnalysisState("loading");
    void request<{ text?: unknown }>("/flashcards/review", {
      method: "POST",
      body: JSON.stringify({ items }),
    })
      .then((data) => {
        if (reviewTokenRef.current !== token) return;
        const text = typeof data.text === "string" ? data.text.trim() : "";
        if (text) {
          setAnalysis(text);
          setAnalysisState("ready");
          return;
        }
        setAnalysis(null);
        setAnalysisState("unavailable");
      })
      .catch(() => {
        if (reviewTokenRef.current !== token) return;
        setAnalysis(null);
        setAnalysisState("unavailable");
      });
  };

  const startSession = async (practiceAnyway = false) => {
    if (starting) return;
    setStarting(true);
    setLoadError(null);
    try {
      const speakEnabled = !SPEAK_MODE_LOCKED && isSpeechRecognitionAvailable();
      let queue: FlashcardStep[] = [];
      if (mode === "speak") {
        if (SPEAK_MODE_LOCKED) {
          setLoadError("Exercícios de fala estão bloqueados por enquanto.");
          return;
        }
        const pool = selectPracticeWords(words, new Date(), practiceAnyway);
        const source = pool.length > 0 ? pool : practiceAnyway ? words : [];
        if (source.length === 0) return;
        const needAi = source
          .filter((word) => !isPhraseFlashcard(word) && isSingleWordName(word.name))
          .map((word) => word.id);
        const sentences = needAi.length > 0 ? await requestSpeakSentences(needAi) : [];
        queue = buildSpeakQueue(source, sentences);
        if (queue.length === 0) {
          setLoadError("Não há palavras ou frases para treinar fala.");
          return;
        }
      } else {
        const pool = selectPracticeWords(words, new Date(), practiceAnyway);
        if (pool.length === 0) return;
        const draft = buildFlashcardQueue(pool, Math.random, [], { speakEnabled });
        const clozes = await requestClozes([...new Set(draft.flatMap(stepWordIds))]);
        queue = buildFlashcardQueue(pool, Math.random, clozes, { speakEnabled });
        if (queue.length === 0) {
          setLoadError("Não há palavras para treinar.");
          return;
        }
      }
      const created = vaultId
        ? await request<{ vaultName?: string }>("/flashcards/sessions", {
            method: "POST",
            body: JSON.stringify({ vaultId }),
          })
        : { vaultName: mode === "speak" ? "Fala" : "Treino" };
      studiedIdsRef.current = new Set();
      clozeAttemptsRef.current = new Map();
      outcomesRef.current = [];
      practiceRef.current = [];
      pendingSavesRef.current = [];
      levelsRef.current = new Map();
      setEvolved([]);
      reviewTokenRef.current += 1;
      setAnalysis(null);
      setAnalysisState("none");
      setNextPractice(null);
      streakRef.current = 0;
      setStreak(0);
      setXpToken(0);
      setLastXpGain(0);
      setSessionXp(0);
      setChallengeStats({ correct: 0, total: 0 });
      setSession({
        vaultName: created.vaultName || vaultName,
        completedWords: 0,
        startTime: new Date(),
        endTime: null,
      });
      goalStepsRef.current = Math.max(queue.length, 1);
      setGoalSteps(goalStepsRef.current);
      if (finishTimerRef.current) {
        clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
      setFinishing(false);
      syncQueue(queue, 0);
      setIsSessionActive(true);
      setShowAnswer(false);
      setShowSummary(false);
    } catch {
      setLoadError("Não foi possível começar a sessão. Tente de novo.");
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!autostart || loading || autostartRef.current || words.length === 0) return;
    autostartRef.current = true;
    void startSession(selectPracticeWords(words).length === 0);
  }, [autostart, loading, words]);

  const rememberLevel = (word: FlashcardWord, next: number) => {
    const level = Math.min(4, Math.max(1, next));
    const current = levelsRef.current.get(word.id);
    if (!current) {
      levelsRef.current.set(word.id, { id: word.id, name: word.name, start: word.confidence, current: level });
      return;
    }
    current.current = level;
  };

  const rememberOutcome = (word: FlashcardWord, kind: ReviewKind, result: string, typed?: string) => {
    // speak stays out of tutor analysis (oral ≠ digitação/esquecimento).
    if (kind !== "speak") {
      outcomesRef.current.push({
        id: word.id,
        kind,
        result,
        ...(typed && result === "miss" ? { typed } : {}),
      });
    }
    practiceRef.current.push({ id: word.id, kind, result });
  };

  const finishStep = (wordIds: number[], extra: FlashcardStep[] = []) => {
    if (finishing) return;
    for (const id of wordIds) studiedIdsRef.current.add(id);
    const nextSteps = [...stepsRef.current, ...extra];
    const nextIndex = indexRef.current + 1;

    syncQueue(nextSteps, nextIndex);
    setShowAnswer(false);

    if (nextIndex >= nextSteps.length) {
      const completed = studiedIdsRef.current.size;
      setFinishing(true);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
      finishTimerRef.current = setTimeout(() => {
        finishTimerRef.current = null;
        setFinishing(false);
        closeSession(completed);
      }, 780);
    }
  };

  const noteChallenge = (word: FlashcardWord, correct: boolean, kind: ChallengeKind, typed?: string) => {
    if (correct) {
      streakRef.current += 1;
      const gain = challengeXpForStreak(streakRef.current);
      setStreak(streakRef.current);
      setLastXpGain(gain);
      setSessionXp((current) => current + gain);
      setXpToken((current) => current + 1);
    } else {
      streakRef.current = 0;
      setStreak(0);
    }
    setChallengeStats((stats) => ({
      total: stats.total + 1,
      correct: stats.correct + (correct ? 1 : 0),
    }));
    rememberOutcome(word, kind, correct ? "ok" : "miss", typed);
    const base = levelsRef.current.get(word.id)?.current ?? word.confidence;
    rememberLevel(word, correct ? base + 1 : base - 1);
    pendingSavesRef.current.push({
      kind: "result",
      wordId: word.id,
      correct,
      challenge: kind,
      streak: correct ? streakRef.current : 0,
    });
  };

  const handleAnswer = (confidence: number) => {
    const step = stepsRef.current[indexRef.current];
    if (!step || step.type !== "recall") return;
    if (!step.retry) {
      pendingSavesRef.current.push({ kind: "progress", wordId: step.word.id, confidence });
      rememberLevel(step.word, confidence);
      rememberOutcome(step.word, "recall", String(confidence));
    }
    const again = !step.retry && confidence <= 2 ? [{ ...step, retry: true as const }] : [];
    finishStep(step.retry ? [] : [step.word.id], again);
  };

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 8 }}>
          <CloseButton onPress={onLeave} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.colors.green} />
        </View>
      </View>
    );
  }

  if (loadError && words.length === 0 && !isSessionActive) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 8 }}>
          <CloseButton onPress={onLeave} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }}>
          <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 16, textAlign: "center" }}>
            {loadError}
          </Text>
          <Pressable
            onPress={() => setReloadToken((token) => token + 1)}
            style={{
              marginTop: 20,
              minWidth: 180,
              height: 44,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.green,
            }}
          >
            <Text style={{ color: "#ffffff", fontFamily: theme.fonts.bold, fontSize: 13 }}>TENTAR DE NOVO</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (words.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 8 }}>
          <CloseButton onPress={onLeave} />
        </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 }}>
        <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 16, textAlign: "center" }}>
          {mode === "speak" ? "Nada para falar agora" : "Nenhuma palavra para estudar"}
        </Text>
        <Text
          style={{
            marginTop: 8,
            color: theme.colors.mutedForeground,
            fontFamily: theme.fonts.regular,
            fontSize: 15,
            textAlign: "center",
          }}
        >
          {mode === "speak"
            ? "Salve palavras ou frases na leitura para treinar fala."
            : "Este vault não tem palavras para revisar agora."}
        </Text>
      </View>
      </View>
    );
  }

  if (showSummary && session) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 8 }}>
          <CloseButton onPress={onLeave} />
        </View>
      <SessionSummary
        session={session}
        challengeCorrect={challengeStats.correct}
        challengeTotal={challengeStats.total}
        sessionXp={sessionXp}
        analysis={analysis}
        analysisState={analysisState}
        nextPractice={nextPractice}
        evolved={evolved}
        onContinue={onLeave}
        onRestart={() => {
          setShowSummary(false);
          void startSession();
        }}
      />
      </View>
    );
  }

  if (autostart && !isSessionActive && !showSummary && words.length > 0 && !loadError) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.colors.green} />
      </View>
    );
  }

  if (!isSessionActive) {
    const due = selectPracticeWords(words);
    const reviewLabel =
      mode === "speak"
        ? due.length === 0
          ? "Nenhuma frase vencida hoje"
          : due.length === 1
            ? "1 frase para falar"
            : `${Math.min(due.length, 10)} frases para falar`
        : due.length === 0
          ? "Nada para revisar hoje"
          : due.length === 1
            ? "1 palavra para revisar"
            : `${Math.min(due.length, 10)} palavras para revisar`;
    return (
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 8 }}>
          <CloseButton onPress={onLeave} />
        </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {vaultName ? (
          <Text style={{ color: theme.colors.foreground, fontFamily: theme.fonts.bold, fontSize: 22, textAlign: "center" }}>
            {vaultName}
          </Text>
        ) : null}
        <Text style={{ marginTop: 8, color: theme.colors.mutedForeground, fontFamily: theme.fonts.regular, fontSize: 15 }}>
          {reviewLabel}
        </Text>
        <Pressable
          disabled={starting}
          onPress={() => void startSession(due.length === 0)}
          style={{
            marginTop: 28,
            minWidth: 210,
            height: 48,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.green,
            opacity: starting ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#ffffff", fontFamily: theme.fonts.bold, fontSize: 14 }}>
            {starting ? "COMEÇANDO..." : due.length === 0 ? "PRATICAR MESMO ASSIM" : "COMEÇAR"}
          </Text>
        </Pressable>
        {loadError ? (
          <View style={{ marginTop: 16, alignItems: "center", gap: 10 }}>
            <Text style={{ color: theme.colors.destructive, fontFamily: theme.fonts.regular, fontSize: 14, textAlign: "center" }}>
              {loadError}
            </Text>
            <Pressable onPress={() => void startSession(due.length === 0)} hitSlop={8}>
              <Text style={{ color: theme.colors.green, fontFamily: theme.fonts.bold, fontSize: 13 }}>
                Tentar de novo
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      </View>
    );
  }

  const step = steps[stepIndex];
  const progress = finishing
    ? 100
    : goalSteps > 0
      ? Math.min(100, Math.max(0, (stepIndex / goalSteps) * 100))
      : 0;

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12 }}>
        <CloseButton
          label="Sair da lição"
          onPress={() => {
            if (!finishing) setConfirmExit(true);
          }}
        />
        <View style={{ flex: 1 }}>
          <ProgressFill
            progress={progress}
            color={theme.colors.green}
            heat={finishing ? Math.max(streakHeat(streak), 2) : streakHeat(streak)}
            height={14}
          />
          <XpFloat token={xpToken} amount={lastXpGain} />
        </View>
        <StreakChip streak={streak} />
        <Pressable
          onPress={() => {
            if (finishing) return;
            const next = !isSoundOn();
            syncSoundEnabled(next);
            setSoundOn(next);
            void writeSoundEnabled(next).catch(() => undefined);
          }}
          accessibilityLabel={soundOn ? "Desligar som" : "Ligar som"}
          hitSlop={8}
        >
          <Ionicons name={soundOn ? "volume-high" : "volume-mute"} size={20} color={theme.colors.mutedForeground} />
        </Pressable>
        <EnergyMark />
      </View>

      <View style={{ flex: 1, overflow: "hidden" }}>
      {finishing || !step ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 22, textAlign: "center" }}>
            Lição completa!
          </Text>
          <Text
            style={{
              marginTop: 8,
              color: theme.shell.muted,
              fontFamily: theme.fonts.regular,
              fontSize: 15,
              textAlign: "center",
            }}
          >
            Preparando o resumo…
          </Text>
        </View>
      ) : (
      <Animated.View
        key={step ? `${step.type}-${stepIndex}` : "empty"}
        entering={motion ? SlideInRight.duration(320) : undefined}
        exiting={motion ? SlideOutLeft.duration(280) : undefined}
        style={{ flex: 1 }}
      >
      {step?.type === "recall" ? (
        <RecallCard word={step.word} showAnswer={showAnswer} onToggle={() => setShowAnswer((current) => !current)} onAnswer={handleAnswer} />
      ) : null}
      {step?.type === "listen" ? (
        <ListenCard
          key={`listen-${step.word.id}-${stepIndex}`}
          word={step.word}
          options={step.options}
          onAnswer={(correct, typed) => {
            if (!step.retry) noteChallenge(step.word, correct, "listen", typed);
            finishStep(step.retry ? [] : [step.word.id], !correct && !step.retry ? [{ ...step, retry: true }] : []);
          }}
        />
      ) : null}
      {step?.type === "cloze" ? (
        <ClozeCard
          key={`cloze-${step.word.id}-${stepIndex}`}
          word={step.word}
          sentence={step.sentence}
          answer={step.answer}
          onAnswer={(correct, typed) => {
            const attempts = (clozeAttemptsRef.current.get(step.word.id) ?? 0) + 1;
            clozeAttemptsRef.current.set(step.word.id, attempts);
            if (!step.retry && shouldRecordClozeResult(attempts)) {
              noteChallenge(step.word, correct, "cloze", typed);
            }
            const counted = !step.retry && shouldRecordClozeResult(attempts);
            finishStep(counted ? [step.word.id] : [], !correct && !step.retry ? [{ ...step, retry: true }] : []);
          }}
        />
      ) : null}
      {step?.type === "match" ? (
        <MatchCard
          key={`match-${step.pairs.map((pair) => pair.word.id).join("-")}-${stepIndex}`}
          pairs={step.pairs}
          onPair={(word, correct, typed) => noteChallenge(word, correct, "match", typed)}
          onComplete={(missed) =>
            finishStep(
              step.pairs.map((pair) => pair.word.id),
              missed.map((word) => recognitionRetry(word, words))
            )
          }
        />
      ) : null}
      {step?.type === "speak" ? (
        <SpeakCard
          key={`speak-${step.word.id}-${stepIndex}`}
          word={step.word}
          sentence={step.sentence}
          onAnswer={(correct) => {
            if (!step.retry) noteChallenge(step.word, correct, "speak");
            finishStep(step.retry ? [] : [step.word.id], !correct && !step.retry ? [{ ...step, retry: true }] : []);
          }}
          onSkip={() => finishStep([])}
        />
      ) : null}
      </Animated.View>
      )}
      </View>
    </ScrollView>
    {confirmExit && !finishing ? <ExitConfirm onStay={() => setConfirmExit(false)} onLeave={leaveLesson} /> : null}
    </View>
  );
}




