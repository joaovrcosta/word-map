import { useState, useEffect, useRef } from "react";
import { useWords } from "@/hooks/use-words";
import { WordItem, ExternalWord, Word, Sentence } from "./types";

export function useSentenceBuilder() {
  // Estados principais
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredWords, setFilteredWords] = useState<(Word | ExternalWord)[]>(
    []
  );
  const [sentenceWords, setSentenceWords] = useState<WordItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [savedSentences, setSavedSentences] = useState<Sentence[]>([]);
  const [selectedSentence, setSelectedSentence] = useState<Sentence | null>(
    null
  );

  // Estados para drag and drop
  const [draggedWord, setDraggedWord] = useState<WordItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);

  // Estados para menu de contexto
  const [contextMenuWordId, setContextMenuWordId] = useState<string | null>(
    null
  );
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Estados para sistema de menções
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionPosition, setMentionPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);

  // Dados externos
  const { words, isLoading } = useWords();

  // Refs
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  return {
    // Estados principais
    searchTerm,
    setSearchTerm,
    filteredWords,
    setFilteredWords,
    sentenceWords,
    setSentenceWords,
    notes,
    setNotes,
    isSearching,
    setIsSearching,
    isTranslating,
    setIsTranslating,
    savedSentences,
    setSavedSentences,
    selectedSentence,
    setSelectedSentence,

    // Estados para drag and drop
    draggedWord,
    setDraggedWord,
    dragOverIndex,
    setDragOverIndex,
    editingWordId,
    setEditingWordId,

    // Estados para menu de contexto
    contextMenuWordId,
    setContextMenuWordId,
    contextMenuPosition,
    setContextMenuPosition,

    // Estados para sistema de menções
    isEditingNotes,
    setIsEditingNotes,
    showMentionDropdown,
    setShowMentionDropdown,
    mentionPosition,
    setMentionPosition,
    mentionQuery,
    setMentionQuery,
    cursorPosition,
    setCursorPosition,

    // Dados externos
    words,
    isLoading,

    // Refs
    dropZoneRef,
    textareaRef,
  };
}
