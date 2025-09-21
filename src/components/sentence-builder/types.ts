export interface WordItem {
  id: string;
  word: Word;
  position: number;
  highlightColor?: string;
}

export interface ExternalWord {
  id: string;
  name: string;
  translations: string[];
  grammaticalClass: string;
  isExternal: true;
}

export interface Sentence {
  id: string;
  words: WordItem[];
  notes: string;
  createdAt: Date;
}

export interface HighlightColor {
  name: string;
  value: string;
  bg: string;
  text: string;
}

export interface MentionOption {
  name: string;
  translations: string;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

// Importar e re-exportar o tipo Word do actions
import { type Word } from "@/actions/actions";

export type { Word };
