"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { WordItem } from "./types";
import { getColorClasses, renderTextWithMentions } from "./utils";

interface NotesSectionProps {
  notes: string;
  isEditingNotes: boolean;
  sentenceWords: WordItem[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onNotesChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onStartEditing: () => void;
  onStopEditing: () => void;
  onRightClick: (e: React.MouseEvent, wordId: string) => void;
}

export function NotesSection({
  notes,
  isEditingNotes,
  sentenceWords,
  textareaRef,
  onNotesChange,
  onKeyDown,
  onStartEditing,
  onStopEditing,
  onRightClick,
}: NotesSectionProps) {
  return (
    <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 dark:bg-gray-950">
      <h3 className="text-lg font-extrabold text-[#3c3c3c] dark:text-white">
        Anotações
      </h3>
      <p className="mt-1 text-sm font-bold text-[#afafaf]">
        Use @ para citar palavras da frase
      </p>

      <div className="mt-4">
        {isEditingNotes ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
                Editando
              </p>
              <Button variant="outline" onClick={onStopEditing}>
                Salvar
              </Button>
            </div>
            <Textarea
              ref={textareaRef}
              placeholder="Faça suas anotações sobre esta frase... Digite @ para referenciar palavras"
              value={notes}
              onChange={onNotesChange}
              onKeyDown={onKeyDown}
              className="min-h-64 resize-none rounded-2xl border-2 font-bold"
            />
          </div>
        ) : (
          <div
            className="min-h-64 cursor-pointer rounded-2xl border-2 border-[#e5e5e5] p-4 transition-colors hover:border-[#1cb0f6]/40"
            onClick={onStartEditing}
          >
            {notes ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
                    Anotações
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEditing();
                    }}
                    className="text-xs font-extrabold uppercase tracking-wide text-[#1cb0f6]"
                  >
                    Editar
                  </button>
                </div>
                <div className="text-sm font-bold leading-6 text-[#3c3c3c] whitespace-pre-wrap break-words">
                  {renderTextWithMentions(notes).map((part) => {
                    if (part.type === "mention") {
                      return (
                        <span
                          key={part.key}
                          className="rounded-full bg-[#1cb0f6] px-2 py-0.5 font-extrabold text-white"
                        >
                          @{part.content}
                        </span>
                      );
                    }
                    return part.content;
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[#777]">
                <div className="text-center">
                  <p className="text-sm font-bold">
                    Clique para adicionar anotações
                  </p>
                  <p className="mt-1 text-xs font-extrabold uppercase tracking-wide text-[#afafaf]">
                    Digite @ para referenciar palavras
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {sentenceWords.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
            Palavras na frase
          </p>
          {sentenceWords
            .sort((a, b) => a.position - b.position)
            .map((wordItem) => (
              <div
                key={wordItem.id}
                className={`flex items-center justify-between gap-2 rounded-2xl border-2 border-[#e5e5e5] p-3 ${getColorClasses(
                  wordItem.highlightColor || ""
                )}`}
                onContextMenu={(e) => onRightClick(e, wordItem.id)}
              >
                <div className="min-w-0 text-sm">
                  <span className="font-extrabold">{wordItem.word.name}</span>
                  <span className="ml-2 font-bold opacity-70">
                    {wordItem.word.translations.join(", ")}
                  </span>
                </div>
                <span className="shrink-0 text-[11px] font-extrabold uppercase tracking-wide text-[#afafaf]">
                  {wordItem.word.grammaticalClass}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
