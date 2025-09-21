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
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[200px] max-h-48 overflow-y-auto"
      style={{
        left: mentionPosition.x,
        top: mentionPosition.y,
      }}
    >
      <div className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
        Selecionar palavra:
      </div>
      {mentionOptions.map((option, index) => (
        <button
          key={index}
          onClick={() => onInsertMention(option.name)}
          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <span className="font-medium">{option.name}</span>
          <span className="text-xs text-gray-500">- {option.translations}</span>
        </button>
      ))}
    </div>
  );
}
