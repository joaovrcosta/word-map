"use client";

import { useEffect, useRef, useState } from "react";
import {
  FlashcardWord,
  FlashcardSession,
  getAllFlashcardWords,
  getFlashcardWords,
  createFlashcardSession,
  updateWordProgress,
  recordChallengeResult,
  type ChallengeKind,
} from "@/actions/flashcards";
import {
  buildFlashcardQueue,
  recognitionRetry,
  selectPracticeWords,
  stepWordIds,
  type FlashcardStep,
} from "@/lib/flashcard-queue";
import { shouldRecordClozeResult } from "@/lib/cloze-text";
import type { ReviewItem } from "@/lib/flashcard-review";
import {
  requestSessionReview,
  requestWordClozes,
} from "@/lib/flashcard-session-client";
import {
  awardPoints,
  POINTS_PER_CHALLENGE,
  rollbackPoints,
  settlePoints,
} from "@/lib/points-optimistic";
import { Flashcard } from "./Flashcard";
import { ListenChallenge } from "./ListenChallenge";
import { MatchChallenge } from "./MatchChallenge";
import { ClozeChallenge } from "./ClozeChallenge";
import { SessionSummary } from "./SessionSummary";
import { FlashcardDeckSkeleton } from "./FlashcardDeckSkeleton";

interface FlashcardDeckProps {
  vaultId?: number;
  vaultName?: string;
  autostart?: boolean;
}

export function FlashcardDeck({ vaultId, vaultName = "Treino", autostart = false }: FlashcardDeckProps) {
  const [words, setWords] = useState<FlashcardWord[]>([]);
  const [session, setSession] = useState<FlashcardSession | null>(null);
  const [steps, setSteps] = useState<FlashcardStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [challengeStats, setChallengeStats] = useState({
    correct: 0,
    total: 0,
  });
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisState, setAnalysisState] = useState<
    "none" | "loading" | "ready" | "unavailable"
  >("none");
  const stepsRef = useRef<FlashcardStep[]>([]);
  const indexRef = useRef(0);
  const studiedRef = useRef(0);
  const clozeAttemptsRef = useRef<Map<number, number>>(new Map());
  const outcomesRef = useRef<ReviewItem[]>([]);
  const reviewTokenRef = useRef(0);
  const autostartRef = useRef(false);

  useEffect(() => {
    loadWords();
  }, [vaultId]);

  const loadWords = async () => {
    try {
      setLoading(true);
      const flashcardWords = vaultId ? await getFlashcardWords(vaultId) : await getAllFlashcardWords();
      setWords(flashcardWords);
    } catch (error) {
      console.error("Erro ao carregar palavras:", error);
    } finally {
      setLoading(false);
    }
  };

  const syncQueue = (nextSteps: FlashcardStep[], nextIndex: number) => {
    stepsRef.current = nextSteps;
    indexRef.current = nextIndex;
    setSteps(nextSteps);
    setStepIndex(nextIndex);
  };

  const startSession = async (practiceAnyway = false) => {
    try {
      const pool = selectPracticeWords(words, new Date(), practiceAnyway);
      if (pool.length === 0) return;
      const draft = buildFlashcardQueue(pool, Math.random, []);
      const ids = [...new Set(draft.flatMap(stepWordIds))];
      const clozes = await requestWordClozes(ids);
      const queue = buildFlashcardQueue(pool, Math.random, clozes);
      if (queue.length === 0) return;
      const newSession = vaultId
        ? await createFlashcardSession(vaultId)
        : {
            id: `session_${Date.now()}`,
            vaultId: 0,
            vaultName,
            totalWords: words.length,
            wordsToReview: pool.length,
            newWords: pool.filter((word) => !word.lastPractice).length,
            completedWords: 0,
            startTime: new Date(),
          };
      studiedRef.current = 0;
      clozeAttemptsRef.current = new Map();
      outcomesRef.current = [];
      reviewTokenRef.current += 1;
      setAnalysis(null);
      setAnalysisState("none");
      setChallengeStats({ correct: 0, total: 0 });
      setSession(newSession);
      syncQueue(queue, 0);
      setIsSessionActive(true);
      setShowAnswer(false);
      setShowSummary(false);
    } catch (error) {
      console.error("Erro ao iniciar sessão:", error);
    }
  };

  useEffect(() => {
    if (!autostart || loading || autostartRef.current || words.length === 0) return;
    autostartRef.current = true;
    void startSession(selectPracticeWords(words).length === 0);
  }, [autostart, loading, words]);

  const closeSession = (completedWords: number) => {
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
    setShowSummary(true);
    setShowAnswer(false);
    const items = outcomesRef.current.slice();
    const token = reviewTokenRef.current;
    if (items.length === 0) {
      setAnalysis(null);
      setAnalysisState("none");
      return;
    }
    setAnalysis(null);
    setAnalysisState("loading");
    void requestSessionReview(items).then((text) => {
      if (reviewTokenRef.current !== token) return;
      if (text) {
        setAnalysis(text);
        setAnalysisState("ready");
        return;
      }
      setAnalysis(null);
      setAnalysisState("unavailable");
    });
  };

  const endSession = () => {
    closeSession(studiedRef.current);
  };

  const restartSession = () => {
    setShowSummary(false);
    startSession();
  };

  const rememberOutcome = (
    word: FlashcardWord,
    kind: ReviewItem["kind"],
    result: string,
    typed?: string
  ) => {
    outcomesRef.current.push({
      id: word.id,
      kind,
      result,
      ...(typed && result === "miss" ? { typed } : {}),
    });
  };

  const finishStep = (wordCount: number, extra: FlashcardStep[] = []) => {
    studiedRef.current += wordCount;
    const nextSteps = [...stepsRef.current, ...extra];
    const nextIndex = indexRef.current + 1;

    syncQueue(nextSteps, nextIndex);
    setShowAnswer(false);

    if (nextIndex >= nextSteps.length) {
      closeSession(studiedRef.current);
    }
  };

  const noteChallenge = (
    word: FlashcardWord,
    correct: boolean,
    kind: ChallengeKind,
    typed?: string
  ) => {
    setChallengeStats((stats) => ({
      total: stats.total + 1,
      correct: stats.correct + (correct ? 1 : 0),
    }));
    rememberOutcome(word, kind, correct ? "ok" : "miss", typed);
    if (correct) awardPoints(POINTS_PER_CHALLENGE);
    void recordChallengeResult(word.id, correct, kind)
      .then(() => {
        if (correct) settlePoints(POINTS_PER_CHALLENGE);
      })
      .catch((error) => {
        if (correct) rollbackPoints(POINTS_PER_CHALLENGE);
        console.error("Erro ao registrar desafio:", error);
      });
  };

  const handleAnswer = async (confidence: number) => {
    const step = stepsRef.current[indexRef.current];
    if (!step || step.type !== "recall") return;

    if (!step.retry) {
      try {
        await updateWordProgress(step.word.id, confidence, 1);
      } catch (error) {
        console.error("Erro ao atualizar progresso:", error);
      }
      rememberOutcome(step.word, "recall", String(confidence));
    }
    const again =
      !step.retry && confidence <= 2 ? [{ ...step, retry: true as const }] : [];
    finishStep(step.retry ? 0 : 1, again);
  };

  if (loading) {
    return <FlashcardDeckSkeleton />;
  }

  if (words.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-[15px] font-extrabold text-[#3c3c3c] dark:text-white">
          Nenhuma palavra para estudar
        </p>
        <p className="mt-2 text-[14px] leading-snug text-[#777] dark:text-[#8b949e]">
          Este vault não tem palavras para revisar agora.
        </p>
      </div>
    );
  }

  if (showSummary && session) {
    return (
      <SessionSummary
        session={session}
        challengeCorrect={challengeStats.correct}
        challengeTotal={challengeStats.total}
        analysis={analysis}
        analysisState={analysisState}
        onRestartSession={restartSession}
      />
    );
  }

  if (autostart && !isSessionActive && !showSummary && words.length > 0) {
    return <FlashcardDeckSkeleton />;
  }

  if (!isSessionActive) {
    const due = selectPracticeWords(words);
    if (due.length === 0) {
      return (
        <div
          aria-label={vaultName}
          className="mx-auto flex max-w-md flex-col items-center py-10 text-center"
        >
          <p className="text-[15px] font-extrabold text-[#3c3c3c] dark:text-white">
            Nada para revisar hoje
          </p>
          <button
            type="button"
            onClick={() => void startSession(true)}
            className="mt-8 inline-flex h-12 min-w-[210px] items-center justify-center rounded-2xl bg-[#24c875] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105"
          >
            Praticar mesmo assim
          </button>
        </div>
      );
    }
    const sessionCount = Math.min(due.length, 10);
    const reviewLabel =
      sessionCount === 1 ? "1 palavra para revisar" : `${sessionCount} palavras para revisar`;

    return (
      <div
        aria-label={vaultName}
        className="mx-auto flex max-w-md flex-col items-center py-10 text-center"
      >
        <p className="text-[14px] text-[#777] dark:text-[#8b949e]">
          {reviewLabel}
        </p>
        <button
          type="button"
          onClick={() => void startSession()}
          className="mt-8 inline-flex h-12 min-w-[210px] items-center justify-center rounded-2xl bg-[#24c875] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105"
        >
          Começar
        </button>
      </div>
    );
  }

  const step = steps[stepIndex];
  const progress =
    steps.length > 0 ? ((stepIndex + 1) / steps.length) * 100 : 0;

  return (
    <div>
      <div className="flex items-center gap-4">
        <p className="shrink-0 text-[13px] font-extrabold tabular-nums text-[#afafaf]">
          {Math.min(stepIndex + 1, steps.length)} / {steps.length}
        </p>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e5e5e5] dark:bg-[#373e47]">
          <div
            className="h-full rounded-full bg-[#24c875]"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <button
          type="button"
          onClick={endSession}
          className="shrink-0 text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf] hover:text-[#777]"
        >
          Pausar
        </button>
      </div>

      {step?.type === "recall" ? (
        <Flashcard
          word={step.word}
          showAnswer={showAnswer}
          onToggleAnswer={() => setShowAnswer((current) => !current)}
          onAnswer={handleAnswer}
        />
      ) : null}

      {step?.type === "listen" ? (
        <ListenChallenge
          key={`${step.word.id}-${step.retry ? "retry" : "first"}`}
          word={step.word}
          options={step.options}
          onAnswer={(correct, typed) => {
            if (!step.retry) noteChallenge(step.word, correct, "listen", typed);
            finishStep(step.retry ? 0 : 1, !correct && !step.retry ? [{ ...step, retry: true }] : []);
          }}
        />
      ) : null}

      {step?.type === "cloze" ? (
        <ClozeChallenge
          key={`${step.word.id}-${clozeAttemptsRef.current.get(step.word.id) ?? 0}`}
          word={step.word}
          sentence={step.sentence}
          answer={step.answer}
          onAnswer={(correct, typed) => {
            const attempts =
              (clozeAttemptsRef.current.get(step.word.id) ?? 0) + 1;
            clozeAttemptsRef.current.set(step.word.id, attempts);
            if (!step.retry && shouldRecordClozeResult(attempts)) {
              noteChallenge(step.word, correct, "cloze", typed);
            }
            const counted = !step.retry && shouldRecordClozeResult(attempts);
            finishStep(counted ? 1 : 0, !correct && !step.retry ? [{ ...step, retry: true }] : []);
          }}
        />
      ) : null}

      {step?.type === "match" ? (
        <MatchChallenge
          key={step.pairs.map((pair) => pair.word.id).join("-")}
          pairs={step.pairs}
          onPair={(word, correct, typed) => noteChallenge(word, correct, "match", typed)}
          onComplete={(missed) =>
            finishStep(
              step.pairs.length,
              missed.map((word) => recognitionRetry(word, words))
            )
          }
        />
      ) : null}
    </div>
  );
}
