"use client";

import { useState } from "react";
import { addChapter } from "@/actions/books";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CreateChapterFormProps {
  bookId: number;
  onSuccess: (chapterId: number) => void;
  onCancel: () => void;
}

export function CreateChapterForm({
  bookId,
  onSuccess,
  onCancel,
}: CreateChapterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const chapter = await addChapter(bookId, title, content);

      toast({
        title: "Capítulo criado!",
        description: `"${title}" foi salvo com sucesso`,
      });

      onSuccess(chapter.id);
    } catch (error) {
      toast({
        title: "Erro ao criar capítulo",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o capítulo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="chapter-title"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Título do capítulo
        </label>
        <Input
          id="chapter-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Digite o título do capítulo"
          required
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="chapter-content"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Conteúdo
        </label>
        <Textarea
          id="chapter-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Cole ou digite o texto aqui..."
          className="min-h-[300px] resize-none"
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          O sistema irá automaticamente identificar palavras que estão nos seus
          vaults
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Salvando..." : "Salvar capítulo"}
        </Button>
      </div>
    </form>
  );
}
