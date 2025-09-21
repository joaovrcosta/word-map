"use client";

import { Card } from "@/components/ui/card";
import { Sentence } from "./types";

interface SavedSentencesProps {
  savedSentences: Sentence[];
  onLoadSentence: (sentence: Sentence) => void;
}

export function SavedSentences({
  savedSentences,
  onLoadSentence,
}: SavedSentencesProps) {
  if (savedSentences.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <h3 className="font-medium text-gray-900 dark:text-white mb-3">
        Frases Salvas
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {savedSentences.map((sentence) => (
          <div
            key={sentence.id}
            className="p-2 border rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => onLoadSentence(sentence)}
          >
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {sentence.words.map((w) => w.word.name).join(" ")}
            </p>
            <p className="text-xs text-gray-500">
              {sentence.createdAt.toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
