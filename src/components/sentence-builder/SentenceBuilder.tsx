"use client";

import { useState, useEffect } from "react";
import { Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

// Componentes internos
import { WordSearch } from "./WordSearch";
import { SentenceConstruction } from "./SentenceConstruction";
import { NotesSection } from "./NotesSection";
import { SavedSentences } from "./SavedSentences";
import { ContextMenu } from "./ContextMenu";
import { MentionDropdown } from "./MentionDropdown";

// Hooks e utilitários
import { useSentenceBuilder } from "./hooks";
import {
  filterWords,
  getMentionOptions,
  calculateMentionPosition,
  generateSentenceText,
} from "./utils";
import {
  addWordToSentence,
  removeWordFromSentence,
  changeWordColor,
  reorderWords,
} from "./data-handlers";

// Tipos
import { WordItem, ExternalWord, Word } from "./types";

export function SentenceBuilder() {
  const {
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
  } = useSentenceBuilder();

  // Filtrar palavras baseado na pesquisa
  useEffect(() => {
    if (!words || searchTerm.length < 2) {
      setFilteredWords([]);
      return;
    }

    setIsSearching(true);
    const filtered = filterWords(words, searchTerm);
    setFilteredWords(filtered);
    setIsSearching(false);
  }, [searchTerm, words, setFilteredWords, setIsSearching]);

  // Fechar menu de contexto e dropdown de menção ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuWordId(null);
      setContextMenuPosition(null);
      setShowMentionDropdown(false);
    };

    if (contextMenuWordId || showMentionDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [
    contextMenuWordId,
    showMentionDropdown,
    setContextMenuWordId,
    setContextMenuPosition,
    setShowMentionDropdown,
  ]);

  // Fechar dropdown quando sair do modo de edição
  useEffect(() => {
    if (!isEditingNotes) {
      setShowMentionDropdown(false);
      setMentionQuery("");
    }
  }, [isEditingNotes, setShowMentionDropdown, setMentionQuery]);

  // Função para fechar menu de contexto
  const closeContextMenu = () => {
    setContextMenuWordId(null);
    setContextMenuPosition(null);
  };

  // Adicionar palavra à frase
  const handleAddWord = async (word: Word | ExternalWord) => {
    const newWordItem = await addWordToSentence(
      word,
      sentenceWords,
      setIsTranslating
    );
    setSentenceWords((prev) => [...prev, newWordItem]);
    setSearchTerm("");
    setFilteredWords([]);
  };

  // Remover palavra da frase
  const handleRemoveWord = (wordId: string) => {
    const updatedWords = removeWordFromSentence(wordId, sentenceWords);
    setSentenceWords(updatedWords);
    closeContextMenu();
  };

  // Alterar cor de destaque
  const handleChangeWordColor = (wordId: string, color: string) => {
    const updatedWords = changeWordColor(wordId, color, sentenceWords);
    setSentenceWords(updatedWords);
    closeContextMenu();
  };

  // Funções de drag and drop
  const handleDragStart = (e: React.DragEvent, wordItem: WordItem) => {
    setDraggedWord(wordItem);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", wordItem.id);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (!draggedWord) return;

    const updatedWords = reorderWords(draggedWord, dropIndex, sentenceWords);
    setSentenceWords(updatedWords);

    setDraggedWord(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedWord(null);
    setDragOverIndex(null);
  };

  // Função para lidar com clique direito
  const handleRightClick = (e: React.MouseEvent, wordId: string) => {
    e.preventDefault();
    setContextMenuWordId(wordId);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  // Função para lidar com mudanças no textarea
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    setNotes(value);
    setCursorPosition(cursorPos);

    // Verificar se acabou de digitar "@"
    if (cursorPos > 0 && value[cursorPos - 1] === "@") {
      // Verificar se é início de linha ou após espaço
      if (cursorPos === 1 || value[cursorPos - 2] === " ") {
        const position = calculateMentionPosition(e.target, cursorPos, notes);
        setMentionPosition(position);
        setMentionQuery("");
        setShowMentionDropdown(true);
      }
    } else if (showMentionDropdown) {
      // Se já está mostrando dropdown, verificar se ainda está digitando após @
      const textBeforeCursor = value.substring(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
          setMentionQuery(textAfterAt);
          const position = calculateMentionPosition(
            e.target,
            lastAtIndex,
            notes
          );
          setMentionPosition(position);
        } else {
          setShowMentionDropdown(false);
        }
      } else {
        setShowMentionDropdown(false);
      }
    }
  };

  // Função para inserir menção
  const handleInsertMention = (wordName: string) => {
    const beforeCursor = notes.substring(0, cursorPosition);
    const afterCursor = notes.substring(cursorPosition);

    // Encontrar a posição do último @
    const lastAtIndex = beforeCursor.lastIndexOf("@");
    if (lastAtIndex === -1) return;

    const beforeAt = beforeCursor.substring(0, lastAtIndex);
    const newText = beforeAt + `@${wordName} ` + afterCursor;

    setNotes(newText);
    setShowMentionDropdown(false);
    setMentionQuery("");

    // Focar no textarea novamente
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeAt.length + wordName.length + 2; // +2 para incluir @ e espaço
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Função para lidar com teclas pressionadas
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      if (showMentionDropdown) {
        setShowMentionDropdown(false);
        setMentionQuery("");
      } else if (isEditingNotes) {
        setIsEditingNotes(false);
      }
    }
  };

  // Função para iniciar edição das anotações
  const handleStartEditingNotes = () => {
    setIsEditingNotes(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Função para parar edição das anotações
  const handleStopEditingNotes = () => {
    setIsEditingNotes(false);
    setShowMentionDropdown(false);
  };

  // Função para limpar frase atual
  const handleClearCurrentSentence = () => {
    setSentenceWords([]);
    setNotes("");
    setSelectedSentence(null);
    setIsEditingNotes(false);
  };

  // Função para salvar frase atual
  const handleSaveCurrentSentence = () => {
    if (sentenceWords.length === 0) return;

    const newSentence = {
      id: `sentence-${Date.now()}`,
      words: [...sentenceWords],
      notes,
      createdAt: new Date(),
    };

    setSavedSentences((prev) => [newSentence, ...prev]);
    handleClearCurrentSentence();
  };

  // Função para carregar uma frase salva
  const handleLoadSentence = (sentence: any) => {
    setSentenceWords(sentence.words);
    setNotes(sentence.notes);
    setSelectedSentence(sentence);
  };

  // Gerar texto da frase
  const sentenceText = generateSentenceText(sentenceWords);

  // Preparar dados para o dropdown de menção
  const mentionOptions = getMentionOptions(sentenceWords, mentionQuery);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Construtor de Frases
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pesquise palavras do vault ou digite palavras novas para construir
            frases
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClearCurrentSentence}
            disabled={sentenceWords.length === 0}
          >
            <Trash2 size={16} className="mr-2" />
            Limpar
          </Button>
          <Button
            onClick={handleSaveCurrentSentence}
            disabled={sentenceWords.length === 0}
          >
            <Save size={16} className="mr-2" />
            Salvar Frase
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Pesquisa de Palavras */}
        <div className="space-y-4">
          <WordSearch
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filteredWords={filteredWords}
            isSearching={isSearching}
            isTranslating={isTranslating}
            onAddWord={handleAddWord}
          />

          {/* Frases Salvas */}
          <SavedSentences
            savedSentences={savedSentences}
            onLoadSentence={handleLoadSentence}
          />
        </div>

        {/* Coluna 2: Área de Construção da Frase */}
        <div className="space-y-4">
          <SentenceConstruction
            sentenceWords={sentenceWords}
            draggedWord={draggedWord}
            dragOverIndex={dragOverIndex}
            sentenceText={sentenceText}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onRightClick={handleRightClick}
          />
        </div>

        {/* Coluna 3: Anotações */}
        <div className="space-y-4">
          <NotesSection
            notes={notes}
            isEditingNotes={isEditingNotes}
            sentenceWords={sentenceWords}
            textareaRef={textareaRef}
            onNotesChange={handleNotesChange}
            onKeyDown={handleKeyDown}
            onStartEditing={handleStartEditingNotes}
            onStopEditing={handleStopEditingNotes}
            onRightClick={handleRightClick}
          />
        </div>
      </div>

      {/* Menu de Contexto */}
      <ContextMenu
        contextMenuWordId={contextMenuWordId}
        contextMenuPosition={contextMenuPosition}
        sentenceWords={sentenceWords}
        onRemoveWord={handleRemoveWord}
        onChangeWordColor={handleChangeWordColor}
      />

      {/* Dropdown de menção */}
      <MentionDropdown
        showMentionDropdown={showMentionDropdown}
        mentionPosition={mentionPosition}
        mentionOptions={mentionOptions}
        onInsertMention={handleInsertMention}
      />
    </div>
  );
}
