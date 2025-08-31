"use client";

import { useState } from "react";
import { createText } from "@/actions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface CreateTextFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateTextForm({ onSuccess, onCancel }: CreateTextFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Pegar userId do contexto de autenticação
      const userId = 1; // Temporário

      await createText(formData.title, formData.content);

      toast({
        title: "Texto criado!",
        description: `"${formData.title}" foi salvo com sucesso`,
      });

      onSuccess();
    } catch (error) {
      console.error("Erro ao criar texto:", error);
      toast({
        title: "Erro ao criar texto",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Título */}
      <div className="space-y-2">
        <label
          htmlFor="title"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Título do texto
        </label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Digite o título do texto"
          required
        />
      </div>

      {/* Conteúdo */}
      <div className="space-y-2">
        <label
          htmlFor="content"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Conteúdo
        </label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, content: e.target.value }))
          }
          placeholder="Cole ou digite o texto aqui..."
          className="min-h-[300px] resize-none"
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          O sistema irá automaticamente identificar palavras que estão nos seus
          vaults
        </p>
      </div>

      {/* Botões */}
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
          {isLoading ? "Salvando..." : "Salvar Texto"}
        </Button>
      </div>
    </form>
  );
}
