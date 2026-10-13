"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Loader2, Quote, Sparkles, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  previewPhrasalCanonical,
  resolveSelectionSave,
  type SelectionSaveType,
  type Vault,
} from "@/actions/actions";
import type { TextSelectionState } from "@/hooks/use-text-selection";

interface TextSelectionPopoverProps {
  selection: TextSelectionState;
  userVaults: Vault[];
  isAddingWord: boolean;
  autoTranslateWordPreview: boolean;
  onSave: (
    vaultId: number,
    word: string,
    translations: string[],
    grammaticalClass: string,
    confidence: number
  ) => Promise<void>;
  onClose: () => void;
}

export function TextSelectionPopover({
  selection,
  userVaults,
  isAddingWord,
  autoTranslateWordPreview,
  onSave,
  onClose,
}: TextSelectionPopoverProps) {
  const { toast } = useToast();
  const [phrasalPreview, setPhrasalPreview] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [activeSaveType, setActiveSaveType] = useState<SelectionSaveType | null>(
    null
  );
  const [resolvedPreview, setResolvedPreview] = useState<string | null>(null);

  const tokenCount = selection.tokens.length;
  const showPhrasalOption = tokenCount === 2;

  useEffect(() => {
    if (!showPhrasalOption) {
      setPhrasalPreview(null);
      return;
    }

    let cancelled = false;
    setLoadingPreview(true);

    previewPhrasalCanonical(selection.text)
      .then((canonical) => {
        if (!cancelled) setPhrasalPreview(canonical);
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selection.text, showPhrasalOption]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-text-selection-popover]")) return;
      if (target?.closest("[data-text-selection-container]")) return;
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [onClose]);

  const handleSave = useCallback(
    async (saveType: SelectionSaveType, vaultId: number) => {
      try {
        setActiveSaveType(saveType);
        const resolved = await resolveSelectionSave(selection.text, saveType);
        setResolvedPreview(resolved.previewLabel);

        let translations = resolved.translations;
        if (autoTranslateWordPreview && saveType !== "frase") {
          try {
            const { translateDefinitions } = await import("@/lib/translate");
            translations = await translateDefinitions(resolved.translations);
          } catch {
            // mantém traduções originais
          }
        }

        await onSave(
          vaultId,
          resolved.name,
          translations,
          resolved.grammaticalClass,
          1
        );
        onClose();
      } catch (error) {
        console.error("Erro ao salvar seleção:", error);
        toast({
          title: "Erro",
          description:
            error instanceof Error
              ? error.message
              : "Não foi possível salvar a seleção",
          variant: "destructive",
        });
      } finally {
        setActiveSaveType(null);
      }
    },
    [autoTranslateWordPreview, onClose, onSave, selection.text, toast]
  );

  const top = Math.min(selection.rect.bottom + 8, window.innerHeight - 320);
  const left = Math.min(
    Math.max(selection.rect.left, 8),
    window.innerWidth - 340
  );

  const popover = (
    <Card
      data-text-selection-popover
      className="fixed z-[200] w-80 shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      style={{ top, left }}
    >
      <CardContent className="p-3 space-y-3">
        <div className="border-b pb-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Seleção
          </p>
          <p className="font-medium text-center">"{selection.text.trim()}"</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Salvar como:
          </p>

          {showPhrasalOption && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                <Sparkles className="w-4 h-4" />
                Phrasal verb
              </div>
              {loadingPreview ? (
                <p className="text-xs text-gray-500">Verificando...</p>
              ) : phrasalPreview ? (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Será salvo como: <strong>{phrasalPreview}</strong>
                </p>
              ) : (
                <p className="text-xs text-gray-500 mb-2">
                  Não é verbo + partícula válida
                </p>
              )}
              {phrasalPreview && (
                <SaveToVaultList
                  userVaults={userVaults}
                  isAddingWord={isAddingWord}
                  isSaving={activeSaveType === "phrasal-verb"}
                  onSelectVault={(vaultId) =>
                    handleSave("phrasal-verb", vaultId)
                  }
                />
              )}
            </div>
          )}

          <div className="rounded-lg border p-2">
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <Type className="w-4 h-4 text-blue-600" />
              Palavra
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Texto completo da seleção
            </p>
            <SaveToVaultList
              userVaults={userVaults}
              isAddingWord={isAddingWord}
              isSaving={activeSaveType === "word"}
              onSelectVault={(vaultId) => handleSave("word", vaultId)}
            />
          </div>

          <div className="rounded-lg border p-2">
            <div className="flex items-center gap-2 text-sm font-medium mb-1">
              <Quote className="w-4 h-4 text-green-600" />
              Frase
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Expressão ou trecho com tradução automática
            </p>
            <SaveToVaultList
              userVaults={userVaults}
              isAddingWord={isAddingWord}
              isSaving={activeSaveType === "frase"}
              onSelectVault={(vaultId) => handleSave("frase", vaultId)}
            />
          </div>
        </div>

        {resolvedPreview && (
          <p className="text-xs text-green-600 text-center">
            Salvo como: {resolvedPreview}
          </p>
        )}

        <Button variant="ghost" size="sm" className="w-full" onClick={onClose}>
          Cancelar
        </Button>
      </CardContent>
    </Card>
  );

  if (typeof document === "undefined") return null;
  return createPortal(popover, document.body);
}

function SaveToVaultList({
  userVaults,
  isAddingWord,
  isSaving,
  onSelectVault,
}: {
  userVaults: Vault[];
  isAddingWord: boolean;
  isSaving: boolean;
  onSelectVault: (vaultId: number) => void;
}) {
  if (userVaults.length === 0) {
    return (
      <p className="text-xs text-gray-500 text-center py-1">
        Nenhum vault disponível
      </p>
    );
  }

  return (
    <div className="space-y-1 max-h-24 overflow-y-auto">
      {userVaults.map((vault) => (
        <button
          key={vault.id}
          type="button"
          disabled={isAddingWord || isSaving}
          onClick={() => onSelectVault(vault.id)}
          className="w-full flex items-center gap-2 p-2 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
        >
          <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="truncate">{vault.name}</span>
          {(isAddingWord || isSaving) && (
            <Loader2 className="w-3 h-3 animate-spin ml-auto shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}
