import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateWord,
  type Word,
  type Vault,
  getVaults,
} from "@/actions/actions";

// Hook para buscar palavras de um vault
export function useWords(vaultId: number) {
  return useQuery({
    queryKey: ["words", vaultId],
    queryFn: async () => {
      const vaults = await getVaults();
      const targetVault = vaults.find((vault) => vault.id === vaultId);
      return targetVault?.words || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para atualizar palavra
export function useUpdateWord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      wordId,
      data,
    }: {
      wordId: number;
      data: Partial<Word>;
    }) => {
      return await updateWord(wordId, data);
    },
    onSuccess: (updatedWord) => {
      // Atualizar o cache diretamente para mudança imediata
      queryClient.setQueryData(["words"], (oldData: Word[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((word) =>
          word.id === updatedWord.id ? updatedWord : word
        );
      });

      // Atualizar o cache dos vaults também
      queryClient.setQueryData(["vaults"], (oldData: Vault[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map((vault) => ({
          ...vault,
          words: vault.words.map((word: Word) =>
            word.id === updatedWord.id ? updatedWord : word
          ),
        }));
      });

      // Invalidar queries para garantir sincronização
      queryClient.invalidateQueries({ queryKey: ["words"] });
      queryClient.invalidateQueries({ queryKey: ["vaults"] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar palavra:", error);
    },
  });
}

// Hook para buscar vaults
export function useVaults() {
  return useQuery({
    queryKey: ["vaults"],
    queryFn: getVaults,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para invalidar queries de palavras
export function useInvalidateWords() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["words"] });
    queryClient.invalidateQueries({ queryKey: ["vaults"] });
  };
}
