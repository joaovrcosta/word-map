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
import { Plus, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createWordConnection, type Word, type Vault } from "@/actions/actions";
import { Badge } from "@/components/ui/badge";

interface CreateWordConnectionDialogProps {
  vaults: Vault[];
  onConnectionCreated: () => void;
}

export function CreateWordConnectionDialog({
  vaults,
  onConnectionCreated,
}: CreateWordConnectionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTermA, setSearchTermA] = useState("");
  const [searchTermB, setSearchTermB] = useState("");
  const [filteredWordsA, setFilteredWordsA] = useState<Word[]>([]);
  const [filteredWordsB, setFilteredWordsB] = useState<Word[]>([]);
  const [selectedWordA, setSelectedWordA] = useState<Word | null>(null);
  const [selectedWordB, setSelectedWordB] = useState<Word | null>(null);
  const [description, setDescription] = useState("");
  const [connectionType, setConnectionType] = useState<
    "semantic" | "grammatical" | "contextual" | "opposite" | "similar"
  >("semantic");

  const { toast } = useToast();

  // Buscar palavras baseado no termo de busca
  const searchWords = (searchTerm: string, vaults: Vault[]): Word[] => {
    if (!searchTerm.trim()) return [];

    const allWords = vaults.flatMap((vault) => vault.words);
    return allWords.filter(
      (word) =>
        word.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.translations.some((translation) =>
          translation.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
  };

  const handleSearchA = (term: string) => {
    setSearchTermA(term);
    if (term.trim()) {
      setFilteredWordsA(searchWords(term, vaults));
    } else {
      setFilteredWordsA([]);
    }
  };

  const handleSearchB = (term: string) => {
    setSearchTermB(term);
    if (term.trim()) {
      setFilteredWordsB(searchWords(term, vaults));
    } else {
      setFilteredWordsB([]);
    }
  };

  const handleSelectWordA = (word: Word) => {
    setSelectedWordA(word);
    setSearchTermA(word.name);
    setFilteredWordsA([]);
  };

  const handleSelectWordB = (word: Word) => {
    setSelectedWordB(word);
    setSearchTermB(word.name);
    setFilteredWordsB([]);
  };

  const handleSubmit = async () => {
    if (!selectedWordA || !selectedWordB) {
      toast({
        title: "Erro",
        description: "Selecione ambas as palavras para criar a conexão",
        variant: "destructive",
      });
      return;
    }

    if (selectedWordA.id === selectedWordB.id) {
      toast({
        title: "Erro",
        description: "Não é possível conectar uma palavra com ela mesma",
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
      await createWordConnection({
        wordAId: selectedWordA.id,
        wordBId: selectedWordB.id,
        description: description.trim(),
        connectionType,
      });

      toast({
        title: "Conexão criada!",
        description: `"${selectedWordA.name}" e "${selectedWordB.name}" foram conectadas`,
      });

      // Resetar formulário
      setSelectedWordA(null);
      setSelectedWordB(null);
      setSearchTermA("");
      setSearchTermB("");
      setDescription("");
      setConnectionType("semantic");
      setIsOpen(false);
      onConnectionCreated();
    } catch (error) {
      console.error("Erro ao criar conexão:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedWordA(null);
    setSelectedWordB(null);
    setSearchTermA("");
    setSearchTermB("");
    setDescription("");
    setConnectionType("semantic");
    setFilteredWordsA([]);
    setFilteredWordsB([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={resetForm}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conexão
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Conexão Semântica</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção da primeira palavra */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Primeira Palavra
            </label>
            <div className="relative">
              <Input
                placeholder="Buscar palavra..."
                value={searchTermA}
                onChange={(e) => handleSearchA(e.target.value)}
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {selectedWordA && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                <Badge variant="outline" className="text-lg">
                  {selectedWordA.name}
                </Badge>
                <Badge variant="secondary">
                  {selectedWordA.grammaticalClass}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedWordA(null);
                    setSearchTermA("");
                  }}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {filteredWordsA.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                {filteredWordsA.map((word) => (
                  <div
                    key={word.id}
                    className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => handleSelectWordA(word)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{word.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({word.grammaticalClass})
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {word.translations[0] || "Sem tradução"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seleção da segunda palavra */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Segunda Palavra
            </label>
            <div className="relative">
              <Input
                placeholder="Buscar palavra..."
                value={searchTermB}
                onChange={(e) => handleSearchB(e.target.value)}
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {selectedWordB && (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <Badge variant="outline" className="text-lg">
                  {selectedWordB.name}
                </Badge>
                <Badge variant="secondary">
                  {selectedWordB.grammaticalClass}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedWordB(null);
                    setSearchTermB("");
                  }}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {filteredWordsB.length > 0 && (
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                {filteredWordsB.map((word) => (
                  <div
                    key={word.id}
                    className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => handleSelectWordB(word)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{word.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({word.grammaticalClass})
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {word.translations[0] || "Sem tradução"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              placeholder="Ex: 'some' é usado para casos definidos e 'any' para casos ainda não conhecidos..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isLoading ||
                !selectedWordA ||
                !selectedWordB ||
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
