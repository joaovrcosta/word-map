import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type Href, router, useFocusEffect } from "expo-router";
import {
  buildFlashcardQueue,
  challengeXpForStreak,
  recognitionRetry,
  selectPracticeWords,
  shouldRecordClozeResult,
  stepWordIds,
  type ClozeSource,
  type FlashcardStep,
  type FlashcardWord,
} from "@word-map/shared";
import { OffenseSheet } from "../study/offense-sheet";
import { PracticeStatsSheet } from "../study/practice-stats-sheet";
import {
  addPracticeXp,
  practiceXpFromTotal,
  readDayPractice,
  readPracticeXp,
  readReviewVaultId,
  recordDayReview,
  writeReviewVaultId,
  type PracticeXpState,
} from "../study/practice-xp";
import { useStudyHeartbeat } from "../study/use-study-heartbeat";
import { useSession } from "../../session";
import type { StudyToday } from "../../study";
import { useTheme } from "../../theme";
import type { Vault } from "../../types";
import { Screen, useTabBarInset } from "../../ui";
import {
  ReviewBringForward,
  ReviewCloze,
  ReviewGuessWord,
  ReviewListen,
  ReviewMatch,
  ReviewSwipeRecall,
} from "./review-cards";
import { vaultLearningStats } from "../vaults/learning-progress";
import { ReviewTopBar, type ReviewVaultOption } from "./review-top-bar";
import { cues, useLessonCues } from "./cues";
import { flushSaves, makeProgressSave } from "./saves";
import { type ChallengeKind, type PendingSave, type RawWord } from "./types";
import { toWord } from "./words";

function nextConfidence(word: FlashcardWord, knew: boolean) {
  if (knew) return Math.min(4, Math.max(3, word.confidence + 1));
  return 1;
}

function ListenOrGuess({
  step,
  pool,
  onAnswer,
}: {
  step: Extract<FlashcardStep, { type: "listen" }>;
  pool: FlashcardWord[];
  onAnswer: (correct: boolean, typed: string) => void;
}) {
  const guessOptions = useMemo(() => wordNameOptions(step.word, pool), [step.word, pool]);
  const asGuess = step.word.id % 2 === 0 && guessOptions.length >= 2;
  if (asGuess) {
    return <ReviewGuessWord word={step.word} options={guessOptions} onAnswer={onAnswer} />;
  }
  return <ReviewListen word={step.word} options={step.options} onAnswer={onAnswer} />;
}

function wordNameOptions(word: FlashcardWord, pool: FlashcardWord[]) {
  const distractors = pool
    .filter((item) => item.id !== word.id && item.name.trim())
    .map((item) => item.name.trim());
  const unique: string[] = [];
  const seen = new Set<string>([word.name.toLowerCase()]);
  for (const name of distractors) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
    if (unique.length >= 3) break;
  }
  const options = [word.name, ...unique];
  for (let index = options.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = options[index]!;
    options[index] = options[swap]!;
    options[swap] = current;
  }
  return options;
}

export function ReviewSwipeDeck() {
  const theme = useTheme();
  const tabInset = useTabBarInset();
  const { request, user } = useSession();
  const userId = user?.id;
  useLessonCues();

  const [words, setWords] = useState<FlashcardWord[]>([]);
  const [vaults, setVaults] = useState<Array<{ id: number; name: string }>>([]);
  const [vaultId, setVaultId] = useState<number | null>(null);
  const [steps, setSteps] = useState<FlashcardStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offenseOpen, setOffenseOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [dayStreak, setDayStreak] = useState(0);
  const [xp, setXp] = useState<PracticeXpState>(() => practiceXpFromTotal(0));
  const [dayXp, setDayXp] = useState(0);
  const [dueDone, setDueDone] = useState(false);

  const stepsRef = useRef<FlashcardStep[]>([]);
  const indexRef = useRef(0);
  const pendingRef = useRef<PendingSave[]>([]);
  const hitStreakRef = useRef(0);
  const levelsRef = useRef<Map<number, number>>(new Map());
  const clozeAttemptsRef = useRef<Map<number, number>>(new Map());
  const clozeCacheRef = useRef<Map<number, ClozeSource>>(new Map());
  const practicedIdsRef = useRef<Set<number>>(new Set());
  const wordsRef = useRef<FlashcardWord[]>([]);
  const wordsByIdRef = useRef<Map<number, FlashcardWord>>(new Map());
  const vaultIdRef = useRef<number | null>(null);
  const appendingRef = useRef(false);

  const scopedWords = useMemo(
    () => (vaultId == null ? words : words.filter((word) => word.vaultId === vaultId)),
    [words, vaultId]
  );
  const vaultMastered = useMemo(
    () => scopedWords.length > 0 && scopedWords.every((word) => Math.round(word.confidence) >= 4),
    [scopedWords]
  );
  const otherVaults = useMemo(
    () => (vaultId == null ? vaults : vaults.filter((vault) => vault.id !== vaultId)),
    [vaultId, vaults]
  );
  const vaultOptions = useMemo<ReviewVaultOption[]>(() => {
    return vaults.map((vault) => {
      const list = words.filter((word) => word.vaultId === vault.id);
      const stats = vaultLearningStats(list);
      return {
        id: vault.id,
        name: vault.name,
        wordCount: stats.total,
        percent: stats.percent,
        parts: { learned: stats.learned, almost: stats.almost, weak: stats.weak },
      };
    });
  }, [vaults, words]);
  const allStats = useMemo(() => vaultLearningStats(words), [words]);
  const allPercent = allStats.percent;
  const allParts = useMemo(
    () => ({ learned: allStats.learned, almost: allStats.almost, weak: allStats.weak }),
    [allStats.learned, allStats.almost, allStats.weak]
  );

  const syncQueue = (nextSteps: FlashcardStep[], nextIndex: number) => {
    stepsRef.current = nextSteps;
    indexRef.current = nextIndex;
    setSteps(nextSteps);
    setStepIndex(nextIndex);
  };

  const scopedSource = useCallback(() => {
    const selected = vaultIdRef.current;
    const all = wordsRef.current;
    return selected == null ? all : all.filter((word) => word.vaultId === selected);
  }, []);

  const patchLocalWord = useCallback((wordId: number, confidence: number, missedLast: boolean) => {
    const current = wordsByIdRef.current.get(wordId);
    if (!current) return;
    current.confidence = confidence;
    current.lastPractice = new Date();
    current.missedLast = missedLast;
    levelsRef.current.set(wordId, confidence);
    practicedIdsRef.current.add(wordId);
  }, []);

  const requestClozes = useCallback(
    async (wordIds: number[]): Promise<ClozeSource[]> => {
      const unique = [...new Set(wordIds)];
      const cached: ClozeSource[] = [];
      const missing: number[] = [];
      for (const wordId of unique) {
        const hit = clozeCacheRef.current.get(wordId);
        if (hit) cached.push(hit);
        else missing.push(wordId);
      }
      for (let index = 0; index < missing.length; index += 20) {
        const batch = missing.slice(index, index + 20);
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
            const cloze = { wordId, sentence, answer };
            clozeCacheRef.current.set(wordId, cloze);
            cached.push(cloze);
          }
        } catch {
          continue;
        }
      }
      return cached;
    },
    [request]
  );

  const buildBatch = useCallback(
    async (source: FlashcardWord[], force = false) => {
      const exclude = practicedIdsRef.current;
      const due = selectPracticeWords(source, new Date(), false, exclude);
      const pool =
        due.length > 0 && !force ? due : force ? selectPracticeWords(source, new Date(), true, exclude) : [];
      if (pool.length === 0) return [] as FlashcardStep[];
      const draft = buildFlashcardQueue(pool, Math.random, [], { speakEnabled: false });
      const clozes = await requestClozes([...new Set(draft.flatMap(stepWordIds))]);
      return buildFlashcardQueue(pool, Math.random, clozes, { speakEnabled: false });
    },
    [requestClozes]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFlipped(false);
    setDueDone(false);
    appendingRef.current = false;
    try {
      const [raw, vaultList, today, practiceXp, dayPractice, savedVault] = await Promise.all([
        request<RawWord[]>("/flashcards/words"),
        request<Vault[]>("/vaults").catch(() => [] as Vault[]),
        request<StudyToday>("/study/today").catch(() => null),
        readPracticeXp(userId),
        readDayPractice(userId),
        readReviewVaultId(userId),
      ]);
      const mapped = (Array.isArray(raw) ? raw : []).map(toWord);
      const options = (Array.isArray(vaultList) ? vaultList : []).map((vault) => ({
        id: vault.id,
        name: vault.name,
      }));
      const nextVault =
        savedVault != null && options.some((vault) => vault.id === savedVault) ? savedVault : null;
      const source = nextVault == null ? mapped : mapped.filter((word) => word.vaultId === nextVault);
      wordsRef.current = mapped;
      wordsByIdRef.current = new Map(mapped.map((word) => [word.id, word]));
      vaultIdRef.current = nextVault;
      practicedIdsRef.current = new Set();
      clozeCacheRef.current = new Map();
      setWords(mapped);
      setVaults(options);
      setVaultId(nextVault);
      setXp(practiceXp);
      setDayXp(dayPractice.xp);
      setDayStreak(today?.currentStreak ?? 0);
      hitStreakRef.current = 0;
      levelsRef.current = new Map();
      clozeAttemptsRef.current = new Map();
      pendingRef.current = [];

      if (source.length === 0) {
        syncQueue([], 0);
      } else {
        setBuilding(true);
        const force = selectPracticeWords(source).length === 0;
        const queue = await buildBatch(source, force);
        syncQueue(queue, 0);
        setDueDone(queue.length === 0);
        setBuilding(false);
      }
    } catch {
      setWords([]);
      wordsRef.current = [];
      wordsByIdRef.current = new Map();
      setVaults([]);
      syncQueue([], 0);
      setError("Não foi possível carregar as palavras.");
    } finally {
      setLoading(false);
      setBuilding(false);
    }
  }, [buildBatch, request, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        void flushSaves(pendingRef.current, request);
      };
    }, [load, request])
  );

  const step = steps[stepIndex] ?? null;
  const peek =
    step?.type === "recall" ? (steps[stepIndex + 1]?.type === "recall" ? steps[stepIndex + 1] : null) : null;

  useStudyHeartbeat({
    kind: "practice",
    enabled: !loading && !building && Boolean(step),
    assumeInteractive: true,
  });

  const awardXp = useCallback(
    (gain: number) => {
      if (gain <= 0) return;
      void addPracticeXp(gain, userId).then(async (next) => {
        setXp(next);
        const day = await readDayPractice(userId);
        setDayXp(day.xp);
      });
    },
    [userId]
  );

  const noteChallenge = useCallback(
    (word: FlashcardWord, correct: boolean, kind: ChallengeKind, typed?: string) => {
      if (correct) {
        hitStreakRef.current += 1;
        awardXp(challengeXpForStreak(hitStreakRef.current));
      } else {
        hitStreakRef.current = 0;
      }
      const base = levelsRef.current.get(word.id) ?? word.confidence;
      const confidence = Math.min(4, Math.max(1, correct ? base + 1 : base - 1));
      patchLocalWord(word.id, confidence, !correct);
      pendingRef.current.push({
        kind: "result",
        wordId: word.id,
        correct,
        challenge: kind,
        streak: correct ? hitStreakRef.current : 0,
      });
      void recordDayReview({ id: word.id, name: word.name }, userId);
      void typed;
    },
    [awardXp, patchLocalWord, userId]
  );

  const appendMore = useCallback(async () => {
    if (appendingRef.current) return;
    appendingRef.current = true;
    setBuilding(true);
    await flushSaves(pendingRef.current, request);
    try {
      const source = scopedSource();
      const nextBatch = await buildBatch(source, false);
      if (nextBatch.length === 0) {
        syncQueue([], 0);
        setDueDone(true);
        return;
      }
      const start = indexRef.current;
      const kept = stepsRef.current.slice(0, start);
      const merged = [...kept, ...nextBatch];
      syncQueue(merged, start);
      setFlipped(false);
      setDueDone(false);
    } finally {
      appendingRef.current = false;
      setBuilding(false);
    }
  }, [buildBatch, request, scopedSource]);

  const finishStep = useCallback(
    (extra: FlashcardStep[] = []) => {
      const nextSteps = [...stepsRef.current, ...extra];
      const nextIndex = indexRef.current + 1;
      syncQueue(nextSteps, nextIndex);
      setFlipped(false);
      if (nextIndex >= nextSteps.length) void appendMore();
    },
    [appendMore]
  );

  const startQueue = useCallback(
    async (force = false, clearPracticed = false) => {
      if (clearPracticed) practicedIdsRef.current = new Set();
      setFlipped(false);
      setDueDone(false);
      hitStreakRef.current = 0;
      clozeAttemptsRef.current = new Map();
      await flushSaves(pendingRef.current, request);
      const source = scopedSource();
      if (source.length === 0) {
        syncQueue([], 0);
        return;
      }
      setBuilding(true);
      try {
        const queue = await buildBatch(source, force);
        syncQueue(queue, 0);
        setDueDone(queue.length === 0);
      } finally {
        setBuilding(false);
      }
    },
    [buildBatch, request, scopedSource]
  );

  const selectVault = useCallback(
    async (nextVault: number | null) => {
      setVaultId(nextVault);
      vaultIdRef.current = nextVault;
      void writeReviewVaultId(nextVault, userId);
      practicedIdsRef.current = new Set();
      const source =
        nextVault == null ? wordsRef.current : wordsRef.current.filter((word) => word.vaultId === nextVault);
      const force = selectPracticeWords(source).length === 0;
      await startQueue(force, true);
    },
    [startQueue, userId]
  );

  const advanceRecall = useCallback(
    (knew: boolean) => {
      const current = stepsRef.current[indexRef.current];
      if (!current || current.type !== "recall") return;
      if (!current.retry) {
        const confidence = nextConfidence(current.word, knew);
        // Rating FSRS: Again(1) / Good(3) — não o nível absoluto.
        pendingRef.current.push(makeProgressSave(current.word.id, knew ? 3 : 1));
        patchLocalWord(current.word.id, confidence, !knew);
        void recordDayReview({ id: current.word.id, name: current.word.name }, userId);
        if (knew) {
          hitStreakRef.current += 1;
          awardXp(challengeXpForStreak(hitStreakRef.current));
          cues.correct();
        } else {
          hitStreakRef.current = 0;
          cues.wrong();
        }
      }
      const again = !knew && !current.retry ? [{ ...current, retry: true as const }] : [];
      finishStep(again);
    },
    [awardXp, finishStep, patchLocalWord, userId]
  );

  if (loading) {
    return (
      <Screen padded={false} reserveTabBar>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.green} />
        </View>
      </Screen>
    );
  }

  const showSwipeHints = step?.type === "recall";

  return (
    <Screen padded={false} reserveTabBar>
      <View style={[styles.root, { paddingBottom: tabInset + 8 }]}>
        <ReviewTopBar
          streak={dayStreak}
          xp={xp}
          dayXp={dayXp}
          vaultId={vaultId}
          vaults={vaultOptions}
          allWordCount={words.length}
          allPercent={allPercent}
          allParts={allParts}
          onSelectVault={(id) => void selectVault(id)}
          onPressStreak={() => setStatsOpen(true)}
          pickerOpen={vaultPickerOpen}
          onPickerOpenChange={setVaultPickerOpen}
        />

        {error ? (
          <View style={styles.center}>
            <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.semibold, textAlign: "center" }}>
              {error}
            </Text>
            <Pressable onPress={() => void load()} style={[styles.cta, { backgroundColor: theme.colors.green }]}>
              <Text style={{ color: "#111", fontFamily: theme.fonts.bold }}>Tentar de novo</Text>
            </Pressable>
          </View>
        ) : words.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 18, textAlign: "center" }}>
              Nenhuma palavra para revisar
            </Text>
            <Text style={styles.emptyHint}>
              Salve palavras em um vault ou pela busca para começar o review.
            </Text>
            <Pressable
              onPress={() => router.push("/vaults" as Href)}
              style={[styles.cta, { backgroundColor: theme.colors.green }]}
            >
              <Text style={{ color: "#111", fontFamily: theme.fonts.bold }}>Ir para Vaults</Text>
            </Pressable>
          </View>
        ) : scopedWords.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 18, textAlign: "center" }}>
              Este vault está vazio
            </Text>
            <Text style={styles.emptyHint}>Escolha outro vault ou “Tudo” para continuar.</Text>
            <Pressable
              onPress={() => void selectVault(null)}
              style={[styles.cta, { backgroundColor: theme.colors.green }]}
            >
              <Text style={{ color: "#111", fontFamily: theme.fonts.bold }}>Praticar tudo</Text>
            </Pressable>
          </View>
        ) : building && !step ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.green} />
          </View>
        ) : vaultMastered && (!step || dueDone) ? (
          <View style={styles.center}>
            <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 18, textAlign: "center" }}>
              Vault 100% aprendido
            </Text>
            <Text style={styles.emptyHint}>
              Volte mais tarde para revisar — as palavras retornam com o tempo. Enquanto isso, escolha outro vault
              para treinar.
            </Text>
            {otherVaults.length > 0 || vaultId != null ? (
              <Pressable
                onPress={() => {
                  if (otherVaults.length > 0) setVaultPickerOpen(true);
                  else void selectVault(null);
                }}
                style={[styles.cta, { backgroundColor: theme.colors.green }]}
              >
                <Text style={{ color: "#111", fontFamily: theme.fonts.bold }}>
                  {otherVaults.length > 0 ? "Escolher outro vault" : "Praticar tudo"}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push("/vaults" as Href)}
                style={[styles.cta, { backgroundColor: theme.colors.green }]}
              >
                <Text style={{ color: "#111", fontFamily: theme.fonts.bold }}>Ir para Vaults</Text>
              </Pressable>
            )}
          </View>
        ) : !step || dueDone ? (
          <View style={styles.center}>
            <Text style={{ color: theme.shell.foreground, fontFamily: theme.fonts.bold, fontSize: 18, textAlign: "center" }}>
              {dueDone ? "Você revisou o que estava due" : "Nada para praticar agora"}
            </Text>
            <Text style={styles.emptyHint}>
              {dueDone
                ? "Pode parar por aqui, ou escolher outro vault para treinar."
                : "Não há palavras vencidas neste vault agora. Escolha outro vault para continuar."}
            </Text>
            <Pressable
              onPress={() => setVaultPickerOpen(true)}
              style={[styles.cta, { backgroundColor: theme.colors.green }]}
            >
              <Text style={{ color: "#111", fontFamily: theme.fonts.bold }}>Escolher outro vault</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.stack}>
              {step.type === "recall" && peek && peek.type === "recall" ? (
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  <ReviewSwipeRecall
                    word={peek.word}
                    pool={scopedWords}
                    front
                    interactive={false}
                    onFlip={() => undefined}
                    onSwiped={() => undefined}
                  />
                </View>
              ) : null}

              <ReviewBringForward
                stepKey={`${step.type}-${stepIndex}-${step.type === "match"
                  ? step.pairs.map((pair) => pair.word.id).join("-")
                  : step.word.id
                  }-${step.retry ? "r" : "n"}`}
              >
                {step.type === "recall" ? (
                  <ReviewSwipeRecall
                    word={step.word}
                    pool={scopedWords}
                    front={!flipped}
                    interactive
                    onFlip={() => setFlipped((value) => !value)}
                    onSwiped={advanceRecall}
                  />
                ) : null}

                {step.type === "listen" ? (
                  <ListenOrGuess
                    key={`listen-${step.word.id}-${stepIndex}-${step.retry ? "r" : "n"}`}
                    step={step}
                    pool={scopedWords}
                    onAnswer={(correct, typed) => {
                      if (!step.retry) noteChallenge(step.word, correct, "listen", typed);
                      finishStep(!correct && !step.retry ? [{ ...step, retry: true }] : []);
                    }}
                  />
                ) : null}

                {step.type === "cloze" ? (
                  <ReviewCloze
                    key={`cloze-${step.word.id}-${stepIndex}-${step.retry ? "r" : "n"}`}
                    word={step.word}
                    sentence={step.sentence}
                    answer={step.answer}
                    onAnswer={(correct, typed) => {
                      const attempts = (clozeAttemptsRef.current.get(step.word.id) ?? 0) + 1;
                      clozeAttemptsRef.current.set(step.word.id, attempts);
                      if (!step.retry && shouldRecordClozeResult(attempts)) {
                        noteChallenge(step.word, correct, "cloze", typed);
                      }
                      finishStep(!correct && !step.retry ? [{ ...step, retry: true }] : []);
                    }}
                  />
                ) : null}

                {step.type === "match" ? (
                  <ReviewMatch
                    key={`match-${step.pairs.map((pair) => pair.word.id).join("-")}-${stepIndex}`}
                    pairs={step.pairs}
                    onPair={(word, correct, typed) => noteChallenge(word, correct, "match", typed)}
                    onComplete={(missed) =>
                      finishStep(missed.map((word) => recognitionRetry(word, scopedWords)))
                    }
                  />
                ) : null}
              </ReviewBringForward>
            </View>

            {showSwipeHints ? (
              <View style={styles.footerHints}>
                <View style={styles.hint}>
                  <Ionicons name="arrow-back" size={16} color="#ff9600" />
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontFamily: theme.fonts.medium, fontSize: 12 }}>
                    Não lembro
                  </Text>
                </View>
                <View style={styles.hint}>
                  <Text style={{ color: "rgba(255,255,255,0.55)", fontFamily: theme.fonts.medium, fontSize: 12 }}>
                    Sabia
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#24c875" />
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>

      <PracticeStatsSheet
        visible={statsOpen}
        onClose={() => setStatsOpen(false)}
        streak={dayStreak}
        xp={xp}
        onChangeGoal={() => {
          setStatsOpen(false);
          setOffenseOpen(true);
        }}
      />
      <OffenseSheet
        visible={offenseOpen}
        onClose={() => setOffenseOpen(false)}
        onSeeStats={() => {
          setOffenseOpen(false);
          router.push("/profile" as Href);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 12, paddingTop: 6 },
  stack: { flex: 1, justifyContent: "center", alignItems: "stretch", minHeight: 0 },
  footerHints: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 2,
    paddingHorizontal: 8,
  },
  hint: { flexDirection: "row", alignItems: "center", gap: 6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  emptyHint: {
    marginTop: 8,
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 18,
  },
  cta: {
    marginTop: 18,
    minWidth: 180,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
});
