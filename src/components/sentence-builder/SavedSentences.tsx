"use client";

import { Trash2, Loader2 } from "lucide-react";
import { Sentence } from "./types";

interface SavedSentencesProps {
  savedSentences: Sentence[];
  isLoadingSentences: boolean;
  onLoadSentence: (sentence: Sentence) => void;
  onDeleteSentence: (sentenceId: string) => void;
}

export function SavedSentences({
  savedSentences,
  isLoadingSentences,
  onLoadSentence,
  onDeleteSentence,
}: SavedSentencesProps) {
  const handleDeleteClick = (e: React.MouseEvent, sentenceId: string) => {
    e.stopPropagation();
    onDeleteSentence(sentenceId);
  };

  return (
    <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 dark:bg-gray-950">
      <h3 className="text-lg font-extrabold text-[#3c3c3c] dark:text-white">
        Frases salvas
      </h3>
      <p className="mt-1 text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf]">
        {isLoadingSentences
          ? "Carregando"
          : `${savedSentences.length} frase${savedSentences.length === 1 ? "" : "s"}`}
      </p>

      {isLoadingSentences ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#1cb0f6]" />
        </div>
      ) : savedSentences.length === 0 ? (
        <p className="py-6 text-center text-sm font-bold text-[#777]">
          Nenhuma frase salva ainda
        </p>
      ) : (
        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {savedSentences.map((sentence) => (
            <div
              key={sentence.id}
              className="group flex cursor-pointer items-start justify-between gap-2 rounded-2xl border-2 border-[#e5e5e5] p-3 transition-colors hover:border-[#1cb0f6]/40"
              onClick={() => onLoadSentence(sentence)}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-[#3c3c3c] dark:text-white">
                  {sentence.words.map((w) => w.word.name).join(" ")}
                </p>
                <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
                  {sentence.createdAt.toLocaleDateString("pt-BR")}
                </p>
                {sentence.notes && (
                  <p className="mt-1 truncate text-xs font-bold text-[#777]">
                    {sentence.notes}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-500 opacity-0 hover:bg-red-50 group-hover:opacity-100"
                onClick={(e) => handleDeleteClick(e, sentence.id)}
                aria-label="Excluir frase"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
