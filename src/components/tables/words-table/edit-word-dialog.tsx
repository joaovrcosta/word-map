"use client";

import { useState } from "react";
import { Word, updateWord } from "@/actions/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { translateToPortuguese } from "@/lib/translate";

interface EditWordDialogProps {
  word: Word;
  onWordUpdated: () => void;
  onTableUpdating?: (isUpdating: boolean) => void;
}

export function EditWordDialog({
  word,
  onWordUpdated,
  onTableUpdating,
}: EditWordDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: word.name,
    grammaticalClass: word.grammaticalClass,
    category: word.category || "",
    translations: [...word.translations],
    confidence: word.confidence,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Notificar que a tabela está sendo atualizada
    onTableUpdating?.(true);

    try {
      // Filtrar traduções vazias
      const rawTranslations = formData.translations.filter(
        (t) => t.trim() !== ""
      );

      // Traduzir traduções para português se estiverem em inglês
      let translations = rawTranslations;
      if (rawTranslations.length > 0) {
        try {
          translations = await Promise.all(
            rawTranslations.map(async (translation) => {
              // Verificar se parece ser inglês (contém apenas caracteres ASCII)
              const isEnglish = /^[a-zA-Z\s\-']+$/.test(translation);
              if (isEnglish) {
                return await translateToPortuguese(translation);
              }
              return translation; // Manter se não for inglês
            })
          );
        } catch (error) {
          console.warn("Erro ao traduzir traduções, usando originais:", error);
          translations = rawTranslations;
        }
      }

      const updatedWord = await updateWord(word.id, {
        name: formData.name,
        grammaticalClass: formData.grammaticalClass,
        category: formData.category || null,
        translations: translations,
        confidence: formData.confidence,
      });

      toast({
        title: "Palavra atualizada!",
        description: `"${formData.name}" foi editada com sucesso`,
      });

      // Fechar o dialog primeiro
      setIsOpen(false);

      // Chamar callback se fornecido
      onWordUpdated();
    } catch (error) {
      console.error("Erro ao editar palavra:", error);
      toast({
        title: "Erro ao editar palavra",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Aguardar um pouco para mostrar o spinner
      setTimeout(() => onTableUpdating?.(false), 500);
    }
  };

  const addTranslation = () => {
    setFormData((prev) => ({
      ...prev,
      translations: [...prev.translations, ""],
    }));
  };

  const removeTranslation = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      translations: prev.translations.filter((_, i) => i !== index),
    }));
  };

  const updateTranslation = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      translations: prev.translations.map((t, i) => (i === index ? value : t)),
    }));
  };

  const resetForm = () => {
    setFormData({
      name: word.name,
      grammaticalClass: word.grammaticalClass,
      category: word.category || "",
      translations: [...word.translations],
      confidence: word.confidence,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          onClick={() => resetForm()}
        >
          <Edit2 className="h-4 w-4 text-blue-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Palavra</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome da palavra */}
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Nome da palavra
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Digite o nome da palavra"
              disabled
            />
          </div>

          {/* Classe gramatical */}
          <div className="space-y-2">
            <label
              htmlFor="grammaticalClass"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Classe gramatical
            </label>
            <Select
              value={formData.grammaticalClass}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, grammaticalClass: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a classe gramatical" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="substantivo">Substantivo</SelectItem>
                <SelectItem value="verbo">Verbo</SelectItem>
                <SelectItem value="adjetivo">Adjetivo</SelectItem>
                <SelectItem value="advérbio">Advérbio</SelectItem>
                <SelectItem value="pronome">Pronome</SelectItem>
                <SelectItem value="preposição">Preposição</SelectItem>
                <SelectItem value="conjunção">Conjunção</SelectItem>
                <SelectItem value="interjeição">Interjeição</SelectItem>
                <SelectItem value="artigo">Artigo</SelectItem>
                <SelectItem value="numeral">Numeral</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <label
              htmlFor="category"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Categoria (opcional)
            </label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value }))
              }
              placeholder="Ex: cores, animais, profissões..."
            />
          </div>

          {/* Traduções */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Traduções
            </label>
            <div className="space-y-2">
              {formData.translations.map((translation, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={translation}
                    onChange={(e) => updateTranslation(index, e.target.value)}
                    placeholder={`Tradução ${index + 1}`}
                    required
                  />
                  {formData.translations.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0 text-red-500 hover:text-red-700"
                      onClick={() => removeTranslation(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTranslation}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar tradução
              </Button>
            </div>
          </div>

          {/* Nível de confiança */}

          {/* Botões */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
