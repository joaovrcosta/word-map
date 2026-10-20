"use client";

import { useEffect, useRef, useState } from "react";
import {
  FlashcardWord,
  FlashcardSession,
  getFlashcardWords,
  createFlashcardSession,
  updateWordProgress,
  recordChallengeResult,
  filterWordsForReview,
  type ChallengeKind,
} from "@/actions/flashcards";
import {
  buildFlashcardQueue,
  type ClozeStep,
  type FlashcardStep,
} from "@/lib/flashcard-queue";
import {
  shouldRecordClozeResult,
  shouldRequeueCloze,
} from "@/lib/cloze-text";
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
  vaultId: number;
  vaultName: string;
}

export function FlashcardDeck({ vaultId, vaultName }: FlashcardDeckProps) {
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

  useEffect(() => {
    loadWords();
  }, [vaultId]);

  const loadWords = async () => {
    try {
      setLoading(true);
      const flashcardWords = await getFlashcardWords(vaultId);
      const wordsForReview = await filterWordsForReview(flashcardWords);
      setWords(wordsForReview);
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

  const startSession = async () => {
    try {
      const newSession = await createFlashcardSession(vaultId);
      const clozes = await requestWordClozes(words.map((word) => word.id));
      const queue = buildFlashcardQueue(words, Math.random, clozes);
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
    result: string
  ) => {
    outcomesRef.current.push({
      name: word.name,
      translation: word.translations.find((item) => item.trim())?.trim() ?? "",
      kind,
      result,
    });
  };

  const finishStep = (
    wordCount: number,
    requeue: FlashcardWord[],
    clozeRetry?: ClozeStep
  ) => {
    studiedRef.current += wordCount;
    let nextSteps = stepsRef.current;
    const nextIndex = indexRef.current + 1;

    for (const word of requeue) {
      const alreadyQueued = nextSteps
        .slice(nextIndex)
        .some((step) => step.type === "recall" && step.word.id === word.id);
      if (!alreadyQueued) {
        nextSteps = [...nextSteps, { type: "recall", word }];
      }
    }

    if (clozeRetry) {
      nextSteps = [...nextSteps, clozeRetry];
    }

    syncQueue(nextSteps, nextIndex);
    setShowAnswer(false);

    if (nextIndex >= nextSteps.length) {
      closeSession(studiedRef.current);
    }
  };

  const noteChallenge = (
    word: FlashcardWord,
    correct: boolean,
    kind: ChallengeKind
  ) => {
    setChallengeStats((stats) => ({
      total: stats.total + 1,
      correct: stats.correct + (correct ? 1 : 0),
    }));
    rememberOutcome(word, kind, correct ? "ok" : "miss");
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

    try {
      await updateWordProgress(step.word.id, confidence, 1);
    } catch (error) {
      console.error("Erro ao atualizar progresso:", error);
    }

    rememberOutcome(step.word, "recall", String(confidence));
    finishStep(1, []);
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

  if (!isSessionActive) {
    const reviewLabel =
      words.length === 1
        ? "1 palavra para revisar"
        : `${words.length} palavras para revisar`;

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
          onClick={startSession}
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
          key={step.word.id}
          word={step.word}
          options={step.options}
          onAnswer={(correct) => {
            noteChallenge(step.word, correct, "listen");
            finishStep(1, correct ? [] : [step.word]);
          }}
        />
      ) : null}

      {step?.type === "cloze" ? (
        <ClozeChallenge
          key={`${step.word.id}-${clozeAttemptsRef.current.get(step.word.id) ?? 0}`}
          word={step.word}
          sentence={step.sentence}
          answer={step.answer}
          onAnswer={(correct) => {
            const attempts =
              (clozeAttemptsRef.current.get(step.word.id) ?? 0) + 1;
            clozeAttemptsRef.current.set(step.word.id, attempts);
            if (shouldRecordClozeResult(attempts)) {
              noteChallenge(step.word, correct, "cloze");
            }
            finishStep(
              shouldRecordClozeResult(attempts) ? 1 : 0,
              [],
              shouldRequeueCloze(attempts, correct) ? step : undefined
            );
          }}
        />
      ) : null}

      {step?.type === "match" ? (
        <MatchChallenge
          key={step.pairs.map((pair) => pair.word.id).join("-")}
          pairs={step.pairs}
          onPair={(word, correct) => noteChallenge(word, correct, "match")}
          onComplete={(missed) => finishStep(step.pairs.length, missed)}
        />
      ) : null}
    </div>
  );
}
