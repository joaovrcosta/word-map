"use client";

import { BookOpen, GripVertical } from "lucide-react";
import { WordItem } from "./types";
import { getColorClasses } from "./utils";

interface SentenceConstructionProps {
  sentenceWords: WordItem[];
  draggedWord: WordItem | null;
  dragOverIndex: number | null;
  sentenceText: string;
  onDragStart: (e: React.DragEvent, wordItem: WordItem) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, dropIndex: number) => void;
  onDragEnd: () => void;
  onRightClick: (e: React.MouseEvent, wordId: string) => void;
}

export function SentenceConstruction({
  sentenceWords,
  draggedWord: _draggedWord,
  dragOverIndex,
  sentenceText,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onRightClick,
}: SentenceConstructionProps) {
  return (
    <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 dark:bg-gray-950">
      <h3 className="text-lg font-extrabold text-[#3c3c3c] dark:text-white">
        Sua frase
      </h3>
      <p className="mt-1 text-sm font-bold text-[#afafaf]">
        Clique, arraste e reordene as palavras
      </p>

      <div className="mt-4 min-h-32 rounded-2xl border-2 border-dashed border-[#e5e5e5] bg-[#f7f7f7] p-4">
        {sentenceWords.length === 0 ? (
          <div className="py-8 text-center">
            <BookOpen size={32} className="mx-auto mb-2 text-[#1cb0f6]" />
            <p className="text-sm font-bold text-[#777]">
              Arraste palavras aqui ou clique nelas para montar a frase.
            </p>
            <p className="mt-2 text-xs font-extrabold uppercase tracking-wide text-[#afafaf]">
              Botão direito para opções
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sentenceWords
              .sort((a, b) => a.position - b.position)
              .map((wordItem, index) => (
                <div
                  key={wordItem.id}
                  className={
                    dragOverIndex === index
                      ? "rounded-2xl ring-2 ring-[#1cb0f6]"
                      : ""
                  }
                  onDragOver={(e) => onDragOver(e, index)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, index)}
                >
                  <button
                    type="button"
                    className={`inline-flex h-11 items-center rounded-2xl border-2 border-b-4 px-3 text-base font-extrabold ${getColorClasses(
                      wordItem.highlightColor || ""
                    )}`}
                    draggable
                    onDragStart={(e) => onDragStart(e, wordItem)}
                    onDragEnd={onDragEnd}
                    onContextMenu={(e) => onRightClick(e, wordItem.id)}
                  >
                    <GripVertical size={12} className="mr-1 text-[#afafaf]" />
                    {wordItem.word.name}
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {sentenceText && (
        <div className="mt-4 rounded-2xl bg-[#ddf4ff] p-4">
          <p className="text-lg font-extrabold text-[#1cb0f6]">
            &ldquo;{sentenceText}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
