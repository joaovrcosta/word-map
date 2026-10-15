"use client";

import { useEffect, useRef, useState } from "react";
import { FlashcardWord } from "@/actions/flashcards";
import { GrammarClassLink } from "@/components/grammar-class-link";
import { FlashcardSkeleton } from "./FlashcardSkeleton";
import { AnswerBurst, playAnswerSound, pulseClass } from "./answer-feedback";

interface FlashcardProps {
  word: FlashcardWord;
  showAnswer: boolean;
  onToggleAnswer: () => void;
  onAnswer: (confidence: number) => void;
}

const RATINGS = [
  { confidence: 1, label: "Não lembro" },
  { confidence: 2, label: "Difícil" },
  { confidence: 3, label: "Bom" },
  { confidence: 4, label: "Fácil" },
] as const;

export function Flashcard({
  word,
  showAnswer,
  onToggleAnswer,
  onAnswer,
}: FlashcardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const lockedRef = useRef(false);
  const aliveRef = useRef(true);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    lockedRef.current = false;
    setBurst(false);
  }, [word?.id]);

  if (!word || !word.name) {
    return <FlashcardSkeleton />;
  }

  const rate = (confidence: number) => {
    if (lockedRef.current) return;
    const good = confidence >= 3;
    playAnswerSound(good);
    if (!good) {
      onAnswer(confidence);
      return;
    }
    lockedRef.current = true;
    pulseClass(rootRef.current, "flashcard-pop");
    setBurst(true);
    window.setTimeout(() => {
      if (!aliveRef.current) return;
      onAnswer(confidence);
    }, 480);
  };

  return (
    <div
      ref={rootRef}
      className="relative mx-auto flex w-full max-w-xl flex-col items-center px-2 py-10"
    >
      {burst ? <AnswerBurst /> : null}
      {word.grammaticalClass ? (
        <GrammarClassLink
          value={word.grammaticalClass}
          className="text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf] hover:text-[#14804a] dark:hover:text-[#7ddea8]"
        />
      ) : null}

      <button
        type="button"
        onClick={onToggleAnswer}
        className="mt-3 text-center text-[40px] font-extrabold leading-tight text-[#3c3c3c] dark:text-white"
      >
        {word.name}
      </button>

      {showAnswer ? (
        <div className="mt-4 space-y-1 text-center">
          {word.translations.length > 0 ? (
            word.translations.map((translation, index) => (
              <p
                key={`${translation}-${index}`}
                className="text-[18px] font-bold text-[#14804a] dark:text-[#7ddea8]"
              >
                {translation}
              </p>
            ))
          ) : (
            <p className="text-[14px] text-[#777]">Sem tradução</p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-[#afafaf]">Toque para ver</p>
      )}

      {showAnswer ? (
        <div className="mt-10 grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {RATINGS.map((rating) => (
            <button
              key={rating.confidence}
              type="button"
              onClick={() => rate(rating.confidence)}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#e8eaed] shadow-sm bg-white px-2 text-[12px] font-extrabold uppercase tracking-wide text-[#3c3c3c] hover:bg-[#f7f7f7] active:translate-y-0.5 dark:border-[#373e47] dark:bg-transparent dark:text-white dark:hover:bg-white/5"
            >
              {rating.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
