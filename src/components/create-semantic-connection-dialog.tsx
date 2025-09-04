"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Search, Edit2 } from "lucide-react";
import { createSemanticConnection } from "@/actions/actions";
import type { Word, Vault } from "@/actions/actions";

interface CreateSemanticConnectionDialogProps {
  vaults: Vault[];
  onConnectionCreated: () => void;
}

interface WordWithDetails {
  word: Word;
  title?: string;
  description?: string;
}

export function CreateSemanticConnectionDialog({
  vaults,
  onConnectionCreated,
}: CreateSemanticConnectionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredWords, setFilteredWords] = useState<Word[]>([]);
  const [selectedWords, setSelectedWords] = useState<WordWithDetails[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [connectionType, setConnectionType] = useState<
    "semantic" | "grammatical" | "contextual" | "opposite" | "similar"
  >("semantic");

  const { toast } = useToast();

  // Buscar palavras baseado no termo de busca
  const searchWords = (searchTerm: string, vaults: Vault[]): Word[] => {
    if (!searchTerm.trim()) return [];

    const allWords = vaults.flatMap((vault) => {
      if (!vault || !vault.words) return [];
      return vault.words;
    });

    return allWords.filter((word) => {
      if (!word || !word.name) return false;
      return word.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  // Lidar com busca de palavras
  const handleSearch = (searchTerm: string) => {
    setSearchTerm(searchTerm);
    if (!vaults || vaults.length === 0) {
      setFilteredWords([]);
      return;
    }
    const results = searchWords(searchTerm, vaults);
    setFilteredWords(results);
  };

  // Adicionar palavra à seleção
  const handleAddWord = (word: Word) => {
    if (!selectedWords.find((w) => w.word.id === word.id)) {
      setSelectedWords([
        ...selectedWords,
        { word, title: "", description: "" },
      ]);
    }
    setSearchTerm("");
    setFilteredWords([]);
  };

  // Remover palavra da seleção
  const handleRemoveWord = (wordId: number) => {
    setSelectedWords(selectedWords.filter((w) => w.word.id !== wordId));
  };

  // Atualizar título de uma palavra
  const handleUpdateWordTitle = (wordId: number, title: string) => {
    setSelectedWords(
      selectedWords.map((w) => (w.word.id === wordId ? { ...w, title } : w))
    );
  };

  // Atualizar descrição de uma palavra
  const handleUpdateWordDescription = (wordId: number, description: string) => {
    setSelectedWords(
      selectedWords.map((w) =>
        w.word.id === wordId ? { ...w, description } : w
      )
    );
  };

  // Reordenar palavras
  const handleReorderWords = (fromIndex: number, toIndex: number) => {
    const newWords = [...selectedWords];
    const [removed] = newWords.splice(fromIndex, 1);
    newWords.splice(toIndex, 0, removed);
    setSelectedWords(newWords);
  };

  // Enviar formulário
  const handleSubmit = async () => {
    if (selectedWords.length < 2) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos 2 palavras para criar uma conexão",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Erro",
        description: "Digite um título para a conexão",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma descrição para a conexão",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await createSemanticConnection({
        title: title.trim(),
        description: description.trim(),
        connectionType,
        words: selectedWords.map((w) => ({
          wordId: w.word.id,
          title: w.title?.trim() || undefined,
          description: w.description?.trim() || undefined,
        })),
      });

      toast({
        title: "Conexão criada!",
        description: `Conexão semântica "${title}" criada com ${selectedWords.length} palavras`,
      });

      resetForm();
      onConnectionCreated();
      setIsOpen(false);
    } catch (error) {
      console.error("Erro ao criar conexão semântica:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro ao criar conexão",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedWords([]);
    setSearchTerm("");
    setTitle("");
    setDescription("");
    setConnectionType("semantic");
    setFilteredWords([]);
  };

  // Verificar se os vaults estão carregados
  if (!vaults || vaults.length === 0) {
    return (
      <Button disabled>
        <Plus className="w-4 h-4 mr-2" />
        Nova Conexão Semântica
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={resetForm}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Conexão Semântica
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Conexão Semântica</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Busca de palavras */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Buscar Palavras
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Digite para buscar palavras..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {filteredWords.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {filteredWords.map((word) => {
                  if (!word || !word.name) return null;

                  return (
                    <div
                      key={word.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={() => handleAddWord(word)}
                    >
                      <div>
                        <div className="font-medium">{word.name}</div>
                        <div className="text-sm text-gray-500">
                          {word.grammaticalClass} •{" "}
                          {vaults.find((v) => v.id === word.vaultId)?.name ||
                            "Vault não encontrado"}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddWord(word);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Palavras selecionadas com campos de título e descrição */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Palavras Selecionadas ({selectedWords.length})
            </label>
            {selectedWords.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                Nenhuma palavra selecionada
              </p>
            ) : (
              <div className="space-y-4">
                {selectedWords.map((wordWithDetails, index) => (
                  <div
                    key={wordWithDetails.word.id}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">
                            {wordWithDetails.word.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {wordWithDetails.word.grammaticalClass} •{" "}
                            {vaults.find(
                              (v) => v.id === wordWithDetails.word.vaultId
                            )?.name || "Vault não encontrado"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {index > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReorderWords(index, index - 1)}
                          >
                            ↑
                          </Button>
                        )}
                        {index < selectedWords.length - 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReorderWords(index, index + 1)}
                          >
                            ↓
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleRemoveWord(wordWithDetails.word.id)
                          }
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Campos de título e descrição para a palavra */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-600">
                          Título da Palavra (Opcional)
                        </label>
                        <Input
                          placeholder="Ex: Uso principal, Contexto específico..."
                          value={wordWithDetails.title || ""}
                          onChange={(e) =>
                            handleUpdateWordTitle(
                              wordWithDetails.word.id,
                              e.target.value
                            )
                          }
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-600">
                          Descrição da Palavra (Opcional)
                        </label>
                        <Textarea
                          placeholder="Ex: Usado em situações formais, Indica quantidade específica..."
                          value={wordWithDetails.description || ""}
                          onChange={(e) =>
                            handleUpdateWordDescription(
                              wordWithDetails.word.id,
                              e.target.value
                            )
                          }
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Título da conexão */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Título da Conexão
            </label>
            <Input
              placeholder="Ex: Palavras de intensidade, Conectores temporais..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Um título descritivo para esta conexão semântica
            </p>
          </div>

          {/* Tipo de conexão */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tipo de Conexão
            </label>
            <Select
              value={connectionType}
              onValueChange={(value: any) => setConnectionType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de conexão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semantic">Semântica</SelectItem>
                <SelectItem value="grammatical">Gramatical</SelectItem>
                <SelectItem value="contextual">Contextual</SelectItem>
                <SelectItem value="opposite">Opostos</SelectItem>
                <SelectItem value="similar">Similares</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descrição da conexão */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Descrição da Conexão
            </label>
            <Textarea
              placeholder="Explique como essas palavras se relacionam semanticamente..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Botões */}
          <div className="flex space-x-3">
            <Button
              onClick={() => setIsOpen(false)}
              className="flex-1"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isLoading ||
                selectedWords.length < 2 ||
                !title.trim() ||
                !description.trim()
              }
              className="flex-1"
            >
              {isLoading ? "Criando..." : "Criar Conexão"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
