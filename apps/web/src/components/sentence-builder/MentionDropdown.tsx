"use client";

import { MentionOption } from "./types";

interface MentionDropdownProps {
  showMentionDropdown: boolean;
  mentionPosition: { x: number; y: number } | null;
  mentionOptions: MentionOption[];
  onInsertMention: (wordName: string) => void;
}

export function MentionDropdown({
  showMentionDropdown,
  mentionPosition,
  mentionOptions,
  onInsertMention,
}: MentionDropdownProps) {
  if (!showMentionDropdown || !mentionPosition || mentionOptions.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed z-50 max-h-48 min-w-[200px] overflow-y-auto rounded-2xl border-2 border-[#e5e5e5] bg-white py-1 shadow-lg dark:bg-gray-950"
      style={{
        left: mentionPosition.x,
        top: mentionPosition.y,
      }}
    >
      <div className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
        Selecionar palavra
      </div>
      {mentionOptions.map((option, index) => (
        <button
          key={index}
          onClick={() => onInsertMention(option.name)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#ddf4ff]"
        >
          <span className="text-sm font-extrabold text-[#3c3c3c]">
            {option.name}
          </span>
          <span className="text-xs font-bold text-[#afafaf]">
            {option.translations}
          </span>
        </button>
      ))}
    </div>
  );
}
