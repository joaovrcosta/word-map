"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <Card className="p-4">
      <h3 className="font-medium text-gray-900 dark:text-white mb-3">
        Anotações
      </h3>

      {/* Sistema de anotações com modo de edição */}
      <div className="space-y-2">
        {isEditingNotes ? (
          // Modo de edição - mostra textarea
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Editando anotações:
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={onStopEditing}
                className="text-xs"
              >
                Salvar
              </Button>
            </div>
            <Textarea
              ref={textareaRef}
              placeholder="Faça suas anotações sobre esta frase... Digite @ para referenciar palavras"
              value={notes}
              onChange={onNotesChange}
              onKeyDown={onKeyDown}
              className="min-h-64 resize-none"
            />
          </div>
        ) : (
          // Modo de visualização - mostra preview
          <div
            className="min-h-64 p-3 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            onClick={onStartEditing}
          >
            {notes ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Anotações:
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartEditing();
                    }}
                    className="text-xs"
                  >
                    Editar
                  </Button>
                </div>
                <div className="text-sm leading-6 whitespace-pre-wrap break-words">
                  {renderTextWithMentions(notes).map((part) => {
                    if (part.type === "mention") {
                      return (
                        <span
                          key={part.key}
                          className="px-1 py-0.5 rounded bg-blue-500 text-white font-medium"
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
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <p className="text-sm">Clique para adicionar anotações</p>
                  <p className="text-xs mt-1">
                    Digite @ para referenciar palavras
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {sentenceWords.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Palavras na frase:
          </h4>
          <div className="space-y-2">
            {sentenceWords
              .sort((a, b) => a.position - b.position)
              .map((wordItem) => (
                <div
                  key={wordItem.id}
                  className={`flex items-center justify-between p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${getColorClasses(
                    wordItem.highlightColor || ""
                  )}`}
                  onContextMenu={(e) => onRightClick(e, wordItem.id)}
                >
                  <div className="text-sm flex-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {wordItem.word.name}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400 ml-2">
                      - {wordItem.word.translations.join(", ")}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({wordItem.word.grammaticalClass})
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Clique direito para opções
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
}
