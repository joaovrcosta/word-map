"use client";

import { useState } from "react";
import { createBook, createOfficialBook } from "@/actions/books";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CreateBookFormProps {
  official?: boolean;
  onSuccess: (bookId: number) => void;
  onCancel: () => void;
}

export function CreateBookForm({
  official = false,
  onSuccess,
  onCancel,
}: CreateBookFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const book = official
        ? await createOfficialBook(title, description)
        : await createBook(title, description);

      toast({
        title: official ? "Livro oficial criado!" : "Livro criado!",
        description: `"${title}" foi salvo com sucesso`,
      });

      onSuccess(book.id);
    } catch (error) {
      toast({
        title: "Erro ao criar livro",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o livro.",
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
          htmlFor="book-title"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Título
        </label>
        <Input
          id="book-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Digite o título do livro"
          required
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="book-description"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Descrição
        </label>
        <Textarea
          id="book-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opcional: resumo ou tema do livro"
          className="min-h-[120px] resize-none"
        />
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
          {isLoading ? "Salvando..." : official ? "Publicar na loja" : "Salvar livro"}
        </Button>
      </div>
    </form>
  );
}
