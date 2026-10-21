"use client";

import { useState } from "react";
import type { FlashcardWord } from "@/actions/flashcards";
import {
  answersMatch,
  clozeTranslationHint,
  splitSentenceAtAnswer,
} from "@/lib/cloze-text";
import { AnswerBurst, playAnswerSound } from "./answer-feedback";

interface ClozeChallengeProps {
  word: FlashcardWord;
  sentence: string;
  answer: string;
  onAnswer: (correct: boolean, typed: string) => void;
}

export function ClozeChallenge({
  word,
  sentence,
  answer,
  onAnswer,
}: ClozeChallengeProps) {
  const [value, setValue] = useState("");
  const [picked, setPicked] = useState<boolean | null>(null);
  const hint = clozeTranslationHint(word.translations, answer);
  const parts = splitSentenceAtAnswer(sentence, answer);
  const initial = answer.trim().slice(0, 2);

  const finish = (correct: boolean) => {
    if (picked !== null) return;
    setPicked(correct);
    playAnswerSound(correct);
    window.setTimeout(() => onAnswer(correct, value), 700);
  };

  const verify = () => {
    finish(answersMatch(value, answer));
  };

  return (
    <div
      className={`relative mx-auto flex w-full max-w-xl flex-col items-center px-2 py-10 ${
        picked === true
          ? "flashcard-pop"
          : picked === false
            ? "flashcard-shake"
            : ""
      }`}
    >
      {picked === true ? <AnswerBurst /> : null}
      <p className="text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf]">
        Complete a frase
      </p>
      <p className="mt-6 text-center text-[22px] font-extrabold leading-snug text-[#3c3c3c] dark:text-white">
        {parts.map((part, index) =>
          part.type === "text" ? (
            <span key={index}>{part.value}</span>
          ) : (
            <span
              key={index}
              className="mx-1 inline-block min-w-16 border-b-2 border-[#24c875] px-1 text-left text-[#14804a] dark:text-[#7ddea8]"
            >
              {initial}
            </span>
          )
        )}
      </p>
      {hint ? (
        <p className="mt-3 text-[15px] text-[#777] dark:text-[#8b949e]">{hint}</p>
      ) : null}
      <form
        className="mt-8 flex w-full flex-col items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          verify();
        }}
      >
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={picked !== null}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-label="Palavra que completa a frase"
          className={`h-12 w-full rounded-2xl border-2 bg-white px-4 text-center text-[16px] font-extrabold text-[#3c3c3c] outline-none dark:bg-transparent dark:text-white ${
            picked === true
              ? "border-[#24c875]"
              : picked === false
                ? "border-red-400"
                : "border-[#e5e5e5] dark:border-[#373e47]"
          }`}
        />
        {picked === false ? (
          <p className="text-[14px] font-bold text-[#24c875]">{answer}</p>
        ) : null}
        <div className="flex w-full flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => finish(false)}
            disabled={picked !== null}
            className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-xl border border-[#e8eaed] bg-white px-5 text-sm font-bold text-[#777] shadow-sm hover:bg-[#f7f7f7] disabled:opacity-60 dark:border-[#373e47] dark:bg-transparent dark:text-[#8b949e] dark:hover:bg-white/5"
          >
            Não sei
          </button>
          <button
            type="submit"
            disabled={picked !== null || !value.trim()}
            className="inline-flex h-12 min-w-[160px] items-center justify-center rounded-2xl bg-[#24c875] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105 disabled:opacity-60"
          >
            Verificar
          </button>
        </div>
      </form>
    </div>
  );
}
