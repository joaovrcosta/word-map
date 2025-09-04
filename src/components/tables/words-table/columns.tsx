"use client";

import {
  Word,
  moveWordToVault,
  deleteWord,
  getVaults,
  type Vault,
  getRelatedWords,
} from "@/actions/actions";
import { XCircle, Plus, ArrowRight, Trash } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { EditWordDialog } from "./edit-word-dialog";
import { LinkWordsDialog } from "./link-words-dialog";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { PencilSimple } from "@phosphor-icons/react/dist/ssr";
import { useUpdateWord, useVaults } from "@/hooks/use-words";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { EditableTranslationsCell } from "./editable-translations-cell";
import { incrementWordFrequency } from "@/actions/actions";

// Componente para a célula da coluna "Salva"
function SavedCell({ word }: { word: Word }) {
  const { data: vaults = [], isLoading } = useVaults();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleMoveToVault = async (vault: Vault) => {
    if (vault.id === word.vaultId) return; // Não mover para o mesmo vault

    try {
      await moveWordToVault(word.id, vault.id);

      toast({
        title: "Palavra movida!",
        description: `"${word.name}" foi movida para o vault "${vault.name}"`,
      });

      // Invalidar o cache do React Query para atualizar a tabela imediatamente
      // Usar uma abordagem mais agressiva para garantir atualização
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
      queryClient.refetchQueries({ queryKey: ["vaults"] });
    } catch (error) {
      console.error("Erro ao mover palavra:", error);
      toast({
        title: "Erro ao mover palavra",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteWord(word.id);

      toast({
        title: "Palavra removida!",
        description: `"${word.name}" foi removida do vault`,
      });

      // Invalidar o cache do React Query para atualizar a tabela imediatamente
      // Usar uma abordagem mais agressiva para garantir atualização
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
      queryClient.refetchQueries({ queryKey: ["vaults"] });
    } catch (error) {
      console.error("Erro ao remover palavra:", error);
      toast({
        title: "Erro ao remover palavra",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Filtrar vaults (excluir o vault atual)
  const availableVaults = vaults.filter((vault) => vault.id !== word.vaultId);

  if (word.isSaved) {
    return (
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={isLoading}
            >
              <CheckCircleIcon
                weight={word.isSaved ? "fill" : "regular"}
                className={`!h-5 !w-5 ${
                  word.isSaved ? "text-green-500" : "text-gray-600"
                }`}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Mover palavra
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {word.name}
              </p>
            </div>

            {/* Opção de unsave */}
            <DropdownMenuItem
              className="px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer text-red-600 dark:text-red-400"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash className="h-4 w-4 mr-2" />
              <span className="text-sm">Remover do vault</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Lista de vaults disponíveis */}
            <div className="max-h-32 overflow-y-auto">
              {availableVaults.length > 0 ? (
                availableVaults.map((vault) => (
                  <DropdownMenuItem
                    key={vault.id}
                    className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleMoveToVault(vault)}
                    disabled={isLoading}
                  >
                    <div className="flex items-center w-full">
                      <ArrowRight className="h-4 w-4 mr-2 text-blue-500" />
                      <span className="text-sm text-gray-900 dark:text-white flex-1">
                        {vault.name}
                      </span>
                      {isLoading && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="px-3 py-2 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Nenhum outro vault disponível
                  </p>
                </div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <XCircle className="text-red-500 w-5 h-5" />
      <span className="text-xs text-gray-500">Não salva</span>
    </div>
  );
}

// Componente para a célula da coluna "Palavras Relacionadas"
function RelatedWordsCell({ word }: { word: Word }) {
  const { data: relatedWords = [], isLoading } = useQuery({
    queryKey: ["relatedWords", word.id],
    queryFn: () => getRelatedWords(word.id),
    staleTime: 0, // Sempre considerar stale para permitir atualizações imediatas
    refetchOnMount: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        <span className="text-sm text-gray-500">Carregando...</span>
      </div>
    );
  }

  if (relatedWords.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Nenhuma palavra relacionada
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {relatedWords.slice(0, 3).map((relatedWord) => (
        <div key={relatedWord.id} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span className="font-medium text-gray-900 dark:text-white">
            {relatedWord.name}
          </span>
          <span className="text-gray-500 dark:text-gray-400 truncate max-w-xs">
            ({relatedWord.translations[0]})
          </span>
        </div>
      ))}
      {relatedWords.length > 3 && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          +{relatedWords.length - 3} mais...
        </div>
      )}
    </div>
  );
}

// Componente para a célula da coluna "Frequência"
function FrequencyCell({ word }: { word: Word }) {
  const [localFrequency, setLocalFrequency] = useState(word.frequency);
  const [isIncrementing, setIsIncrementing] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleIncrement = async () => {
    if (isIncrementing || isDisabled) return;

    setIsIncrementing(true);
    setIsDisabled(true);

    // Atualização otimista - incrementar visualmente imediatamente
    setLocalFrequency((prev) => prev + 1);

    try {
      // Incrementar a frequência no banco de dados
      await incrementWordFrequency(word.id);

      toast({
        title: "Frequência atualizada!",
        description: `"${word.name}" agora tem ${
          localFrequency + 1
        } ocorrências`,
      });

      // Invalidar o cache do React Query para atualizar a tabela
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
    } catch (error) {
      console.error("Erro ao incrementar frequência:", error);
      // Em caso de erro, reverter para o valor anterior
      setLocalFrequency(word.frequency);

      toast({
        title: "Erro ao atualizar frequência",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsIncrementing(false);

      // Desabilitar o botão por 500ms
      setTimeout(() => {
        setIsDisabled(false);
      }, 650);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="text-lg font-semibold text-gray-900 dark:text-white min-w-[2rem] text-center">
          {localFrequency}
        </span>
        <button
          onClick={handleIncrement}
          disabled={isIncrementing || isDisabled}
          className="p-1 rounded-full bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title={`Incrementar frequência de "${word.name}"${
            isDisabled && !isIncrementing ? " (aguarde 500ms)" : ""
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export const columns: ColumnDef<Word>[] = [
  {
    id: "audio",
    header: "Áudio",
    cell: ({ row }) => {
      const wordName = row.original.name;

      const handlePlayAudio = () => {
        // Usar a API de síntese de fala do navegador
        if ("speechSynthesis" in window) {
          // Cancelar qualquer fala em andamento
          window.speechSynthesis.cancel();

          // Criar uma nova fala
          const utterance = new SpeechSynthesisUtterance(wordName);
          utterance.lang = "en-US"; // Inglês
          utterance.rate = 0.8; // Velocidade um pouco mais lenta
          utterance.pitch = 1; // Tom normal

          // Reproduzir o áudio
          window.speechSynthesis.speak(utterance);
        } else {
          console.log("Síntese de fala não suportada neste navegador");
        }
      };

      return (
        <div className="flex items-center justify-center">
          <button
            onClick={handlePlayAudio}
            className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 text-[#1cb0f6] hover:text-[#1c8df6] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            title={`Ouvir pronúncia de "${wordName}"`}
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      );
    },
  },
  {
    accessorKey: "name",
    header: "Palavra",
    cell: ({ row }) => {
      return <EditableTranslationsCell word={row.original} />;
    },
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <EditWordDialog
            word={row.original}
            onWordUpdated={() => {
              // O cache será atualizado automaticamente pelo React Query
            }}
          />
          <LinkWordsDialog
            word={row.original}
            onWordsLinked={() => {
              // O cache será atualizado automaticamente pelo React Query
            }}
          />
        </div>
      );
    },
  },
  {
    accessorKey: "isSaved",
    header: "Salva",
    cell: ({ row }) => {
      return <SavedCell word={row.original} />;
    },
  },
  {
    accessorKey: "grammaticalClass",
    header: "Categoria gramatical",
    cell: ({ row }) => {
      const grammaticalClass = row.getValue("grammaticalClass") as string;
      return <span className="capitalize">{grammaticalClass}</span>;
    },
  },
  {
    accessorKey: "relatedWords",
    header: "Palavras Relacionadas",
    cell: ({ row }) => {
      return <RelatedWordsCell word={row.original} />;
    },
  },
  {
    accessorKey: "category",
    header: "Categoria",
    cell: ({ row }) => {
      const category = row.getValue("category") as string;
      return <span className="capitalize">{category}</span>;
    },
  },
  {
    accessorKey: "confidence",
    header: "Grau de confiança",
    cell: ({ row }) => {
      const [localConfidence, setLocalConfidence] = useState(
        row.original.confidence
      );
      const updateWordMutation = useUpdateWord();

      const getConfidenceText = (level: number) => {
        switch (level) {
          case 1:
            return "Iniciante";
          case 2:
            return "Básico";
          case 3:
            return "Intermediário";
          case 4:
            return "Avançado";
          default:
            return "Desconhecido";
        }
      };

      const getConfidenceColor = (level: number) => {
        switch (level) {
          case 1:
            return "text-red-500";
          case 2:
            return "text-yellow-500";
          case 3:
            return "text-blue-500";
          case 4:
            return "text-green-500";
          default:
            return "text-gray-500";
        }
      };

      const handleConfidenceChange = async (newLevel: number) => {
        if (newLevel === localConfidence || updateWordMutation.isPending)
          return;

        // Atualização otimista - mudança visual imediata
        setLocalConfidence(newLevel);

        try {
          await updateWordMutation.mutateAsync({
            wordId: row.original.id,
            data: { confidence: newLevel },
          });
          // A confiança já foi atualizada visualmente, não precisa fazer nada aqui
        } catch (error) {
          console.error("Erro ao atualizar confiança:", error);
          // Em caso de erro, reverter para o valor anterior
          setLocalConfidence(row.original.confidence);
        }
      };

      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2"></div>
          <div className="flex gap-1 px-1">
            {Array.from({ length: 4 }).map((_, i) => {
              const level = i + 1;
              return (
                <button
                  key={i}
                  onClick={() => handleConfidenceChange(level)}
                  disabled={updateWordMutation.isPending}
                  className={`h-3 w-2 rounded-sm transition-all duration-200 hover:scale-110 cursor-pointer ${
                    i < localConfidence
                      ? "bg-yellow-500 hover:bg-yellow-600"
                      : "bg-gray-300 hover:bg-gray-400"
                  } ${
                    updateWordMutation.isPending
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  title={`Clique para definir como ${getConfidenceText(level)}`}
                />
              );
            })}
          </div>
          {updateWordMutation.isPending && (
            <div className="text-xs text-gray-500 text-center">
              Atualizando...
            </div>
          )}
        </div>
      );
    },
  },

  {
    accessorKey: "frequency",
    header: "Frequência",
    cell: ({ row }) => {
      return <FrequencyCell word={row.original} />;
    },
  },
  {
    accessorKey: "createdAt",
    header: "Data de Criação",
    cell: ({ row }) => {
      const createdAt = row.getValue("createdAt") as Date;
      const formattedDate = new Date(createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formattedDate}
        </div>
      );
    },
  },
];
