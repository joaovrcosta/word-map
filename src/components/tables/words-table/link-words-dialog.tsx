"use client";

import { useState, useEffect } from "react";
import {
  Word,
  linkWords,
  unlinkWords,
  getRelatedWords,
  getLinkableWords,
} from "@/actions/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Link, Unlink, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface LinkWordsDialogProps {
  word: Word;
  onWordsLinked: () => void;
}

export function LinkWordsDialog({ word, onWordsLinked }: LinkWordsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [relatedWords, setRelatedWords] = useState<Word[]>([]);
  const [linkableWords, setLinkableWords] = useState<Word[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar palavras relacionadas e linkáveis quando o modal abre
  useEffect(() => {
    if (isOpen) {
      fetchRelatedWords();
      fetchLinkableWords();
    }
  }, [isOpen, word.id]);

  const fetchRelatedWords = async () => {
    try {
      const related = await getRelatedWords(word.id);
      setRelatedWords(related);
    } catch (error) {
      console.error("Erro ao buscar palavras relacionadas:", error);
    }
  };

  const fetchLinkableWords = async () => {
    try {
      const linkable = await getLinkableWords(word.id);
      setLinkableWords(linkable);
    } catch (error) {
      console.error("Erro ao buscar palavras linkáveis:", error);
    }
  };

  const handleLinkWord = async (targetWordId: number) => {
    setIsLoading(true);
    try {
      await linkWords(word.id, targetWordId);

      toast({
        title: "Palavras linkadas!",
        description: "As palavras foram conectadas com sucesso",
      });

      // Atualizar as listas locais
      await fetchRelatedWords();
      await fetchLinkableWords();

      // Invalidar o cache do React Query para atualizar a tabela imediatamente
      // Usar uma abordagem mais agressiva para garantir atualização
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
      queryClient.invalidateQueries({ queryKey: ["relatedWords"] });
      queryClient.refetchQueries({ queryKey: ["vaults"] });
      queryClient.refetchQueries({ queryKey: ["relatedWords"] });

      // Chamar callback se fornecido
      onWordsLinked();
    } catch (error) {
      console.error("Erro ao linkar palavras:", error);
      toast({
        title: "Erro ao linkar palavras",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlinkWord = async (targetWordId: number) => {
    setIsLoading(true);
    try {
      await unlinkWords(word.id, targetWordId);

      toast({
        title: "Link removido!",
        description: "As palavras foram desconectadas",
      });

      // Atualizar as listas locais
      await fetchRelatedWords();
      await fetchLinkableWords();

      // Invalidar o cache do React Query para atualizar a tabela imediatamente
      // Usar uma abordagem mais agressiva para garantir atualização
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
      queryClient.invalidateQueries({ queryKey: ["relatedWords"] });
      queryClient.refetchQueries({ queryKey: ["vaults"] });
      queryClient.refetchQueries({ queryKey: ["relatedWords"] });

      // Chamar callback se fornecido
      onWordsLinked();
    } catch (error) {
      console.error("Erro ao deslinkar palavras:", error);
      toast({
        title: "Erro ao remover link",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar palavras linkáveis baseado na busca
  const filteredLinkableWords = linkableWords.filter(
    (w) =>
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.translations.some((t) =>
        t.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-purple-50 dark:hover:bg-purple-900/20"
        >
          <Link className="h-4 w-4 text-purple-600" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Links - {word.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Palavras já relacionadas */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Palavras Relacionadas ({relatedWords.length})
            </h3>

            {relatedWords.length > 0 ? (
              <div className="grid gap-2">
                {relatedWords.map((relatedWord) => (
                  <div
                    key={relatedWord.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {relatedWord.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {relatedWord.translations.join(", ")}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleUnlinkWord(relatedWord.id)}
                      disabled={isLoading}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Nenhuma palavra relacionada ainda
              </p>
            )}
          </div>

          {/* Adicionar novos links */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Adicionar Novos Links
            </h3>

            {/* Campo de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar palavras para linkar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Lista de palavras linkáveis */}
            <div className="max-h-48 overflow-y-auto space-y-2">
              {filteredLinkableWords.length > 0 ? (
                filteredLinkableWords.map((linkableWord) => (
                  <div
                    key={linkableWord.id}
                    className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {linkableWord.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {linkableWord.translations.join(", ")}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {linkableWord.grammaticalClass} • Nível{" "}
                        {linkableWord.confidence}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                      onClick={() => handleLinkWord(linkableWord.id)}
                      disabled={isLoading}
                    >
                      <Link className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  {searchTerm
                    ? "Nenhuma palavra encontrada"
                    : "Nenhuma palavra disponível para linkar"}
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
