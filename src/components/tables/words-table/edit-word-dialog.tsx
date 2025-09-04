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
import { Edit2, Plus, X, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface EditWordDialogProps {
  word: Word;
  onWordUpdated: () => void;
  onTableUpdating?: (isUpdating: boolean) => void;
}

interface SortableTranslationItemProps {
  id: string;
  translation: string;
  index: number;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function SortableTranslationItem({
  id,
  translation,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: SortableTranslationItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-2 ${isDragging ? "opacity-50" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-8 h-10 cursor-grab hover:bg-gray-100 rounded transition-colors"
        title="Arrastar para reordenar"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      <Input
        value={translation}
        onChange={(e) => onUpdate(index, e.target.value)}
        placeholder={`Tradução ${index + 1}`}
        required
        className="flex-1"
      />
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 text-red-500 hover:text-red-700"
          onClick={() => onRemove(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
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
  const [translationKeys, setTranslationKeys] = useState<number[]>(
    word.translations.map((_, index) => index)
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = formData.translations.findIndex(
        (_, index) => `translation-${index}` === active.id
      );
      const newIndex = formData.translations.findIndex(
        (_, index) => `translation-${index}` === over.id
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const newTranslations = arrayMove(
          formData.translations,
          oldIndex,
          newIndex
        );
        const newKeys = arrayMove(translationKeys, oldIndex, newIndex);

        setFormData((prev) => ({
          ...prev,
          translations: newTranslations,
        }));
        setTranslationKeys(newKeys);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Notificar que a tabela está sendo atualizada
    onTableUpdating?.(true);

    try {
      // Filtrar traduções vazias
      const translations = formData.translations.filter((t) => t.trim() !== "");

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
    const newKey = Math.max(...translationKeys, 0) + 1;
    setFormData((prev) => ({
      ...prev,
      translations: [...prev.translations, ""],
    }));
    setTranslationKeys((prev) => [...prev, newKey]);
  };

  const removeTranslation = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      translations: prev.translations.filter((_, i) => i !== index),
    }));
    setTranslationKeys((prev) => prev.filter((_, i) => i !== index));
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
    setTranslationKeys(word.translations.map((_, index) => index));
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
                <SelectItem value="phrasel-verb">Phrasal Verb</SelectItem>
                <SelectItem value="slang">Slang</SelectItem>
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={formData.translations.map(
                    (_, index) => `translation-${index}`
                  )}
                  strategy={verticalListSortingStrategy}
                >
                  {formData.translations.map((translation, index) => (
                    <SortableTranslationItem
                      key={translationKeys[index]}
                      id={`translation-${index}`}
                      translation={translation}
                      index={index}
                      onUpdate={updateTranslation}
                      onRemove={removeTranslation}
                      canRemove={formData.translations.length > 1}
                    />
                  ))}
                </SortableContext>
              </DndContext>
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
