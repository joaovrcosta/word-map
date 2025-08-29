"use client";

import {
  Word,
  moveWordToVault,
  deleteWord,
  getVaults,
  type Vault,
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
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";

// Componente para a célula da coluna "Salva"
function SavedCell({ word }: { word: Word }) {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Buscar vaults disponíveis
  useEffect(() => {
    const fetchVaults = async () => {
      try {
        const vaultsData = await getVaults();
        setVaults(vaultsData);
      } catch (error) {
        console.error("Erro ao buscar vaults:", error);
      }
    };
    fetchVaults();
  }, []);

  const handleMoveToVault = async (vault: Vault) => {
    if (vault.id === word.vaultId) return; // Não mover para o mesmo vault

    setIsLoading(true);
    try {
      await moveWordToVault(word.id, vault.id);

      toast({
        title: "Palavra movida!",
        description: `"${word.name}" foi movida para o vault "${vault.name}"`,
      });

      // Recarregar a página para atualizar a tabela
      window.location.reload();
    } catch (error) {
      console.error("Erro ao mover palavra:", error);
      toast({
        title: "Erro ao mover palavra",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteWord(word.id);

      toast({
        title: "Palavra removida!",
        description: `"${word.name}" foi removida do vault`,
      });

      // Recarregar a página para atualizar a tabela
      window.location.reload();
    } catch (error) {
      console.error("Erro ao remover palavra:", error);
      toast({
        title: "Erro ao remover palavra",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

export const columns: ColumnDef<Word>[] = [
  {
    accessorKey: "name",
    header: "Palavra",
    cell: ({ row }) => {
      const wordName = row.getValue("name") as string;
      const wordTranslations = row.original.translations;

      return (
        <div className="">
          <p className="font-medium">{wordName}</p>
          <p className="text-sm text-gray-500">{wordTranslations.join(", ")}</p>
        </div>
      );
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
    accessorKey: "category",
    header: "Categoria",
    cell: ({ row }) => {
      const category = row.getValue("category") as string;
      return <span className="capitalize">{category}</span>;
    },
  },
  {
    accessorKey: "confidence",
    header: "Nível de Confiança",
    cell: ({ row }) => {
      const confidence = row.getValue("confidence") as number;

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

      return (
        <div className="flex items-center gap-2">
          <span className={`font-medium ${getConfidenceColor(confidence)}`}>
            {confidence}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            - {getConfidenceText(confidence)}
          </span>
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
];
