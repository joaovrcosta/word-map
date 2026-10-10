"use client";

import { FlashcardWord } from "@/actions/flashcards";
import { FlashcardSkeleton } from "./FlashcardSkeleton";

interface FlashcardProps {
  word: FlashcardWord;
  showAnswer: boolean;
  onToggleAnswer: () => void;
  onAnswer: (confidence: number) => void;
}

const GRAMMATICAL_CLASS_LABELS: Record<string, string> = {
  substantivo: "Substantivo",
  verbo: "Verbo",
  adjetivo: "Adjetivo",
  adverbio: "Advérbio",
  pronome: "Pronome",
  preposicao: "Preposição",
  conjuncao: "Conjunção",
  interjeicao: "Interjeição",
  "phrasal-verb": "Phrasal verb",
  frase: "Frase",
};

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
  if (!word || !word.name) {
    return <FlashcardSkeleton />;
  }

  const grammaticalClass =
    GRAMMATICAL_CLASS_LABELS[word.grammaticalClass] ?? word.grammaticalClass;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-2 py-10">
      {grammaticalClass ? (
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
          {grammaticalClass}
        </p>
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
                className="text-[18px] font-bold text-[#2b7de9] dark:text-sky-300"
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
              onClick={() => onAnswer(rating.confidence)}
              className="inline-flex h-12 items-center justify-center rounded-2xl border-2 border-[#e5e5e5] bg-white px-2 text-[12px] font-extrabold uppercase tracking-wide text-[#3c3c3c] hover:bg-[#f7f7f7] active:translate-y-0.5 dark:border-[#373e47] dark:bg-transparent dark:text-white dark:hover:bg-white/5"
            >
              {rating.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
