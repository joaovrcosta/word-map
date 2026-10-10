"use client";

import { useState, useEffect } from "react";
import {
  FlashcardWord,
  FlashcardSession,
  getFlashcardWords,
  createFlashcardSession,
  updateWordProgress,
  filterWordsForReview,
} from "@/actions/flashcards";
import { Flashcard } from "./Flashcard";
import { SessionSummary } from "./SessionSummary";
import { FlashcardDeckSkeleton } from "./FlashcardDeckSkeleton";

interface FlashcardDeckProps {
  vaultId: number;
  vaultName: string;
}

export function FlashcardDeck({ vaultId, vaultName }: FlashcardDeckProps) {
  const [words, setWords] = useState<FlashcardWord[]>([]);
  const [session, setSession] = useState<FlashcardSession | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);

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

  const startSession = async () => {
    try {
      const newSession = await createFlashcardSession(vaultId);
      setSession(newSession);
      setIsSessionActive(true);
      setCurrentWordIndex(0);
      setShowAnswer(false);
    } catch (error) {
      console.error("Erro ao iniciar sessão:", error);
    }
  };

  const closeSession = (completedWords: number) => {
    if (session) {
      setSession({
        ...session,
        endTime: new Date(),
        completedWords,
      });
    }
    setIsSessionActive(false);
    setShowSummary(true);
    setShowAnswer(false);
  };

  const endSession = () => {
    closeSession(currentWordIndex);
  };

  const restartSession = () => {
    setShowSummary(false);
    setCurrentWordIndex(0);
    startSession();
  };

  const handleAnswer = async (confidence: number) => {
    if (currentWordIndex >= words.length) return;

    const currentWord = words[currentWordIndex];

    try {
      await updateWordProgress(currentWord.id, confidence, 1);

      if (currentWordIndex + 1 < words.length) {
        setCurrentWordIndex((prev) => prev + 1);
        setShowAnswer(false);
      } else {
        closeSession(words.length);
      }
    } catch (error) {
      console.error("Erro ao atualizar progresso:", error);
    }
  };

  const toggleAnswer = () => {
    setShowAnswer(!showAnswer);
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
      <SessionSummary session={session} onRestartSession={restartSession} />
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

  const currentWord = words[currentWordIndex];
  const progress = ((currentWordIndex + 1) / words.length) * 100;

  return (
    <div>
      <div className="flex items-center gap-4">
        <p className="shrink-0 text-[13px] font-extrabold tabular-nums text-[#afafaf]">
          {currentWordIndex + 1} / {words.length}
        </p>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e5e5e5] dark:bg-[#373e47]">
          <div
            className="h-full rounded-full bg-[#1cb0f6]"
            style={{ width: `${progress}%` }}
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

      <Flashcard
        word={currentWord}
        showAnswer={showAnswer}
        onToggleAnswer={toggleAnswer}
        onAnswer={handleAnswer}
      />
    </div>
  );
}
