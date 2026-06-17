"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isValidSelectionForSave,
  parseSelectionTokens,
} from "@/lib/word-matching";

export interface TextSelectionState {
  text: string;
  tokens: string[];
  rect: DOMRect;
}

export function useTextSelection(enabled = true) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [selection, setSelection] = useState<TextSelectionState | null>(null);

  const containerRef = useCallback((node: HTMLElement | null) => {
    setContainer(node);
  }, []);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, []);

  useEffect(() => {
    if (!container || !enabled) return;

    const handleMouseUp = () => {
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

        const range = sel.getRangeAt(0);
        if (!container.contains(range.commonAncestorContainer)) return;

        const text = sel.toString().trim();
        if (!text) return;

        const tokens = parseSelectionTokens(text);
        if (!isValidSelectionForSave(tokens)) {
          setSelection(null);
          return;
        }

        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        setSelection({
          text,
          tokens,
          rect: DOMRect.fromRect({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          }),
        });
      });
    };

    container.addEventListener("mouseup", handleMouseUp);
    return () => container.removeEventListener("mouseup", handleMouseUp);
  }, [container, enabled]);

  return { containerRef, selection, clearSelection, setSelection };
}
