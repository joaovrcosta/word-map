"use client";

import { Trash2 } from "lucide-react";
import { HIGHLIGHT_COLORS } from "./constants";
import { WordItem } from "./types";

interface ContextMenuProps {
  contextMenuWordId: string | null;
  contextMenuPosition: { x: number; y: number } | null;
  sentenceWords: WordItem[];
  onRemoveWord: (wordId: string) => void;
  onChangeWordColor: (wordId: string, color: string) => void;
}

export function ContextMenu({
  contextMenuWordId,
  contextMenuPosition,
  sentenceWords,
  onRemoveWord,
  onChangeWordColor,
}: ContextMenuProps) {
  if (!contextMenuWordId || !contextMenuPosition) {
    return null;
  }

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[200px]"
      style={{
        left: contextMenuPosition.x,
        top: contextMenuPosition.y,
      }}
    >
      <div className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
        Opções da palavra
      </div>

      {/* Opções de cores */}
      <div className="px-3 py-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Destacar com cor:
        </div>
        <div className="flex flex-wrap gap-1">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onChangeWordColor(contextMenuWordId, color.value)}
              className={`w-6 h-6 rounded-full border-2 ${
                sentenceWords.find((w) => w.id === contextMenuWordId)
                  ?.highlightColor === color.value
                  ? "border-gray-800"
                  : "border-gray-300"
              } ${color.bg}`}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700"></div>

      {/* Opção de excluir */}
      <button
        onClick={() => onRemoveWord(contextMenuWordId)}
        className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
      >
        <Trash2 size={14} />
        Excluir palavra
      </button>
    </div>
  );
}
