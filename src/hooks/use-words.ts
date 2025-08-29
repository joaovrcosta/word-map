import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateWord,
  type Word,
  type Vault,
  getVaults,
} from "@/actions/actions";

// Cache keys para evitar queries duplicadas
const CACHE_KEYS = {
  vaults: ["vaults"],
  words: (vaultId?: number) => ["words", vaultId],
  currentVault: (vaultId?: number) => ["currentVault", vaultId],
} as const;

// Hook para buscar vaults com cache inteligente
export function useVaults() {
  return useQuery({
    queryKey: CACHE_KEYS.vaults,
    queryFn: getVaults,
    staleTime: 0, // Sempre considerar stale para permitir atualizações imediatas
    gcTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Sempre buscar ao montar
  });
}

// Hook para buscar palavras de um vault específico
export function useWords(vaultId?: number) {
  const { data: vaults, isLoading, error } = useVaults();

  const currentVault = vaultId
    ? vaults?.find((v) => v.id === vaultId)
    : vaults?.[0];
  const words = currentVault?.words || [];

  return {
    vaults,
    currentVault,
    words,
    isLoading,
    error,
  };
}

// Hook para atualizar palavra com cache otimizado
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
      // Atualizar o cache de vaults de forma otimizada
      queryClient.setQueryData(
        CACHE_KEYS.vaults,
        (oldData: Vault[] | undefined) => {
          if (!oldData) return oldData;

          return oldData.map((vault) => {
            if (vault.words.some((word) => word.id === updatedWord.id)) {
              return {
                ...vault,
                words: vault.words.map((word) =>
                  word.id === updatedWord.id ? updatedWord : word
                ),
              };
            }
            return vault;
          });
        }
      );

      // Invalidar queries relacionadas para sincronização
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.vaults });
      queryClient.invalidateQueries({ queryKey: ["relatedWords"] });

      // Forçar refetch imediato
      queryClient.refetchQueries({ queryKey: CACHE_KEYS.vaults });
      queryClient.refetchQueries({ queryKey: ["relatedWords"] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar palavra:", error);
    },
  });
}

// Hook para buscar vault específico com cache
export function useVault(vaultId: number) {
  const { data: vaults } = useVaults();
  return vaults?.find((v) => v.id === vaultId);
}
