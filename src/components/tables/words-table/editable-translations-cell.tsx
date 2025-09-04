"use client";

import { useState, memo, useCallback } from "react";
import { Word } from "@/actions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Check, X } from "lucide-react";
import { useUpdateWord } from "@/hooks/use-words";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface EditableTranslationsCellProps {
  word: Word;
}

export const EditableTranslationsCell = memo(function EditableTranslationsCell({
  word,
}: EditableTranslationsCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [translations, setTranslations] = useState(
    word.translations.join(", ")
  );
  const [isLoading, setIsLoading] = useState(false);
  const updateWordMutation = useUpdateWord();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setTranslations(word.translations.join(", "));
  }, [word.translations]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setTranslations(word.translations.join(", "));
  }, [word.translations]);

  const handleSave = useCallback(async () => {
    if (translations.trim() === "") {
      toast({
        title: "Erro",
        description: "As traduções não podem estar vazias",
        variant: "destructive",
      });
      return;
    }

    const newTranslations = translations
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (newTranslations.length === 0) {
      toast({
        title: "Erro",
        description: "Pelo menos uma tradução é necessária",
        variant: "destructive",
      });
      return;
    }

    // Verificar se realmente houve mudança
    const currentTranslations = word.translations.join(", ");
    if (translations === currentTranslations) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await updateWordMutation.mutateAsync({
        wordId: word.id,
        data: { translations: newTranslations },
      });

      toast({
        title: "Traduções atualizadas!",
        description: `"${word.name}" foi atualizada com sucesso`,
      });

      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao atualizar traduções:", error);
      toast({
        title: "Erro ao atualizar",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      // Reverter para o valor original
      setTranslations(word.translations.join(", "));
    } finally {
      setIsLoading(false);
    }
  }, [
    translations,
    word.translations,
    word.id,
    word.name,
    updateWordMutation,
    toast,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const cleanTranslations = word.translations.map((t) =>
    t.replace(/;/g, "").trim()
  );

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={translations}
          onChange={(e) => setTranslations(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0"
          placeholder="Digite as traduções separadas por vírgula"
          disabled={isLoading}
          autoFocus
        />
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isLoading}
            className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600"
            title="Salvar (Enter)"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
            title="Cancelar (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {isLoading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[18px]">{word.name}</p>
        <div className="flex flex-wrap gap-1 max-w-[600px] mt-2">
          {cleanTranslations.map((translation, index) => {
            const isLong = translation.length > 80;
            const displayText = isLong
              ? translation.substring(0, 80) + "..."
              : translation;

            return (
              <span
                key={index}
                className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200 lowercase cursor-default"
                title={isLong ? translation : undefined}
              >
                {displayText}
              </span>
            );
          })}
        </div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleEdit}
        className="p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 hover:text-blue-600"
        title="Editar traduções"
      >
        <p className="text-sm">Editar traduções</p>
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  );
});
