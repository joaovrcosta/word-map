"use client";

import { useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import type { FlashcardWord } from "@/actions/flashcards";
import { playWordAudio } from "@/components/reading-word-panel";
import type { MatchPair } from "@/lib/flashcard-queue";

interface MatchChallengeProps {
  pairs: MatchPair[];
  onPair: (word: FlashcardWord, correct: boolean) => void;
  onComplete: (missed: FlashcardWord[]) => void;
}

function shufflePairs(pairs: MatchPair[]) {
  const copy = [...pairs];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }
  return copy;
}

export function MatchChallenge({
  pairs,
  onPair,
  onComplete,
}: MatchChallengeProps) {
  const [choices] = useState(() => shufflePairs(pairs));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrongChoiceId, setWrongChoiceId] = useState<number | null>(null);
  const scoredRef = useRef(new Set<number>());
  const missedRef = useRef<FlashcardWord[]>([]);

  const mark = (word: FlashcardWord, correct: boolean) => {
    if (scoredRef.current.has(word.id)) return;
    scoredRef.current.add(word.id);
    if (!correct) missedRef.current = [...missedRef.current, word];
    onPair(word, correct);
  };

  const selectAudio = (word: FlashcardWord) => {
    if (matched.includes(word.id)) return;
    setSelectedId(word.id);
    setWrongChoiceId(null);
    playWordAudio(word.name);
  };

  const selectTranslation = (choice: MatchPair) => {
    if (selectedId === null || matched.includes(choice.word.id)) return;

    const audio = pairs.find((pair) => pair.word.id === selectedId);
    if (!audio) return;

    const isCorrect = audio.word.id === choice.word.id;
    if (isCorrect) {
      const nextMatched = [...matched, audio.word.id];
      setMatched(nextMatched);
      setSelectedId(null);
      setWrongChoiceId(null);
      mark(audio.word, true);
      if (nextMatched.length === pairs.length) {
        onComplete(missedRef.current);
      }
      return;
    }

    setWrongChoiceId(choice.word.id);
    mark(audio.word, false);
    window.setTimeout(() => {
      setSelectedId(null);
      setWrongChoiceId(null);
    }, 450);
  };

  const rowClass = (active: boolean, done: boolean, wrong: boolean) => {
    if (done) {
      return "border-[#58cc02] bg-[#58cc02]/10 text-[#3c3c3c] dark:text-white";
    }
    if (wrong) return "border-red-400 text-[#3c3c3c] dark:text-white";
    if (active) {
      return "border-[#1cb0f6] bg-[#ddf4ff] text-[#1cb0f6] dark:bg-[#1cb0f6]/15";
    }
    return "border-[#e5e5e5] bg-white text-[#3c3c3c] hover:bg-[#f7f7f7] dark:border-[#373e47] dark:bg-transparent dark:text-white dark:hover:bg-white/5";
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-2 py-8">
      <p className="text-[15px] font-extrabold text-[#3c3c3c] dark:text-white">
        Combine os pares
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
        <div className="flex flex-col gap-3">
          {pairs.map((pair, index) => {
            const done = matched.includes(pair.word.id);
            return (
              <button
                key={pair.word.id}
                type="button"
                disabled={done}
                onClick={() => selectAudio(pair.word)}
                aria-label={`Ouvir ${index + 1}`}
                className={`inline-flex h-14 items-center gap-3 rounded-2xl border-2 px-3 text-left ${rowClass(
                  selectedId === pair.word.id,
                  done,
                  false
                )}`}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-current text-[12px] font-extrabold">
                  {index + 1}
                </span>
                <Volume2 className="size-4 shrink-0 text-[#1cb0f6]" />
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3">
          {choices.map((choice, index) => {
            const done = matched.includes(choice.word.id);
            return (
              <button
                key={choice.word.id}
                type="button"
                disabled={done || selectedId === null}
                onClick={() => selectTranslation(choice)}
                className={`inline-flex h-14 items-center gap-3 rounded-2xl border-2 px-3 text-left text-[15px] font-extrabold ${rowClass(
                  false,
                  done,
                  wrongChoiceId === choice.word.id
                )}`}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#e5e5e5] text-[12px] font-extrabold text-[#afafaf] dark:border-[#373e47]">
                  {pairs.length + index + 1}
                </span>
                <span className="truncate">{choice.translation}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
