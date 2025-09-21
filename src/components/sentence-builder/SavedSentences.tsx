"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  if (isLoadingSentences) {
    return (
      <Card className="p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">
          Frases Salvas
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      </Card>
    );
  }

  if (savedSentences.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-3">
          Frases Salvas
        </h3>
        <p className="text-sm text-gray-500 text-center py-4">
          Nenhuma frase salva ainda
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-medium text-gray-900 dark:text-white mb-3">
        Frases Salvas ({savedSentences.length})
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {savedSentences.map((sentence) => (
          <div
            key={sentence.id}
            className="p-2 border rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
            onClick={() => onLoadSentence(sentence)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {sentence.words.map((w) => w.word.name).join(" ")}
                </p>
                <p className="text-xs text-gray-500">
                  {sentence.createdAt.toLocaleDateString()}
                </p>
                {sentence.notes && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {sentence.notes}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 h-6 w-6 p-0"
                onClick={(e) => handleDeleteClick(e, sentence.id)}
              >
                <Trash2 size={12} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
