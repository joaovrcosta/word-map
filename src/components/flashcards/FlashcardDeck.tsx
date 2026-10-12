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
  type FlashcardStep,
} from "@/lib/flashcard-queue";
import { Flashcard } from "./Flashcard";
import { ListenChallenge } from "./ListenChallenge";
import { MatchChallenge } from "./MatchChallenge";
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
  const stepsRef = useRef<FlashcardStep[]>([]);
  const indexRef = useRef(0);
  const studiedRef = useRef(0);

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
      const queue = buildFlashcardQueue(words);
      studiedRef.current = 0;
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
  };

  const endSession = () => {
    closeSession(studiedRef.current);
  };

  const restartSession = () => {
    setShowSummary(false);
    startSession();
  };

  const finishStep = (wordCount: number, requeue: FlashcardWord[]) => {
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
    void recordChallengeResult(word.id, correct, kind).catch((error) => {
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
          className="mt-8 inline-flex h-12 min-w-[210px] items-center justify-center rounded-2xl border-b-4 border-[#1899d6] bg-[#1cb0f6] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105 active:translate-y-0.5 active:border-b-2"
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
            className="h-full rounded-full bg-[#1cb0f6]"
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
