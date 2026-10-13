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
      className="fixed z-50 min-w-[200px] rounded-2xl border-2 border-[#e5e5e5] bg-white py-2 shadow-lg dark:bg-gray-950"
      style={{
        left: contextMenuPosition.x,
        top: contextMenuPosition.y,
      }}
    >
      <div className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
        Opções da palavra
      </div>

      <div className="px-3 py-2">
        <div className="mb-2 text-xs font-bold text-[#777]">Destacar</div>
        <div className="flex flex-wrap gap-1">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onChangeWordColor(contextMenuWordId, color.value)}
              className={`h-6 w-6 rounded-full border-2 ${
                sentenceWords.find((w) => w.id === contextMenuWordId)
                  ?.highlightColor === color.value
                  ? "border-[#3c3c3c]"
                  : "border-[#e5e5e5]"
              } ${color.bg}`}
              title={color.name}
            />
          ))}
        </div>
      </div>

      <div className="mx-3 border-t-2 border-[#e5e5e5]" />

      <button
        onClick={() => onRemoveWord(contextMenuWordId)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-extrabold text-red-500 hover:bg-red-50"
      >
        <Trash2 size={14} />
        Excluir palavra
      </button>
    </div>
  );
}
