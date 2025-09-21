"use client";

import { BookOpen, GripVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  draggedWord,
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
    <Card className="p-4">
      <h3 className="font-medium text-gray-900 dark:text-white mb-3">
        Sua Frase
      </h3>

      {/* Área de drop para palavras */}
      <div className="min-h-32 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        {sentenceWords.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
            <p>
              Arraste palavras aqui ou clique nelas para construir sua frase.
              <br />
              <span className="text-sm opacity-75">
                Você pode arrastar e reordenar as palavras na frase
              </span>
              <br />
              <span className="text-sm opacity-75">
                Clique com botão direito para opções
              </span>
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sentenceWords
              .sort((a, b) => a.position - b.position)
              .map((wordItem, index) => (
                <div
                  key={wordItem.id}
                  className={`relative ${
                    dragOverIndex === index
                      ? "ring-2 ring-blue-500 ring-opacity-50"
                      : ""
                  }`}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, index)}
                >
                  <Badge
                    variant="secondary"
                    className={`px-3 !h-12 py-1 text-lg border-b-[4px] border-[#e5e5e5] !rounded-[12px] transition-colors hover:shadow-md ${getColorClasses(
                      wordItem.highlightColor || ""
                    )}`}
                    draggable
                    onDragStart={(e) => onDragStart(e, wordItem)}
                    onDragEnd={onDragEnd}
                    onContextMenu={(e) => onRightClick(e, wordItem.id)}
                  >
                    <GripVertical size={12} className="mr-1 text-gray-400" />
                    {wordItem.word.name}
                  </Badge>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Texto da frase */}
      {sentenceText && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-lg font-medium text-blue-900 dark:text-blue-100">
            "{sentenceText}"
          </p>
        </div>
      )}
    </Card>
  );
}
