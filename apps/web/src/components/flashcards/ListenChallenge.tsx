"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import type { FlashcardWord } from "@/actions/flashcards";
import { playWordAudio } from "@/components/reading-word-panel";
import { AnswerBurst, playAnswerSound } from "./answer-feedback";

interface ListenChallengeProps {
  word: FlashcardWord;
  options: string[];
  onAnswer: (correct: boolean, typed: string) => void;
}

export function ListenChallenge({
  word,
  options,
  onAnswer,
}: ListenChallengeProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const aliveRef = useRef(true);
  const correct =
    word.translations.find((item) => item.trim())?.trim().toLowerCase() ?? "";

  useEffect(() => {
    aliveRef.current = true;
    playWordAudio(word.name);
    return () => {
      aliveRef.current = false;
    };
  }, [word.id, word.name]);

  const choose = (option: string) => {
    if (picked) return;
    const isCorrect = option.trim().toLowerCase() === correct;
    setPicked(option);
    playAnswerSound(isCorrect);
    window.setTimeout(() => {
      if (!aliveRef.current) return;
      onAnswer(isCorrect, option);
    }, 700);
  };

  return (
    <div
      className={`relative mx-auto flex w-full max-w-xl flex-col items-center px-2 py-10 ${
        picked === null
          ? ""
          : picked.trim().toLowerCase() === correct
            ? "flashcard-pop"
            : "flashcard-shake"
      }`}
    >
      {picked !== null && picked.trim().toLowerCase() === correct ? (
        <AnswerBurst />
      ) : null}
      <p className="text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf]">
        Ouça e marque a tradução
      </p>
      <button
        type="button"
        onClick={() => playWordAudio(word.name)}
        className="mt-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#24c875] bg-[#e7f8ee] text-[#14804a] dark:text-[#7ddea8] dark:bg-[#24c875]/15"
        aria-label="Ouvir de novo"
      >
        <Volume2 className="size-7" />
      </button>

      <div className="mt-8 flex w-full flex-col gap-3">
        {options.map((option) => {
          const isPicked = picked === option;
          const isRight = option.trim().toLowerCase() === correct;
          const showRight = picked !== null && isRight;
          const showWrong = isPicked && !isRight;

          return (
            <button
              key={option}
              type="button"
              disabled={picked !== null}
              onClick={() => choose(option)}
              className={`inline-flex h-12 items-center justify-center rounded-2xl border-2 px-4 text-[15px] font-extrabold ${
                showRight
                  ? "border-[#24c875] bg-[#24c875]/10 text-[#3c3c3c] dark:text-white"
                  : showWrong
                    ? "border-red-400 text-[#3c3c3c] dark:text-white"
                    : "border-[#e5e5e5] bg-white text-[#3c3c3c] hover:bg-[#f7f7f7] dark:border-[#373e47] dark:bg-transparent dark:text-white dark:hover:bg-white/5"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
