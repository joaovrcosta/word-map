import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateWord,
  type Word,
  type Vault,
  getVaults,
} from "@/actions/actions";
import { useDebouncedMutation } from "./use-debounced-mutation";

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
    staleTime: 30 * 1000, // 30 segundos - dados ficam "frescos" por mais tempo
    gcTime: 10 * 60 * 1000, // 10 minutos - manter no cache por mais tempo
    refetchOnWindowFocus: false, // Não refetch ao focar na janela
    refetchOnMount: false, // Não refetch ao montar se já temos dados
    refetchOnReconnect: true, // Refetch quando reconectar à internet
    retry: 2, // Tentar novamente em caso de erro
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
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
    onMutate: async ({ wordId, data }) => {
      // Cancelar queries em andamento para evitar conflitos
      await queryClient.cancelQueries({ queryKey: CACHE_KEYS.vaults });

      // Snapshot do estado anterior para rollback
      const previousVaults = queryClient.getQueryData(CACHE_KEYS.vaults);

      // Atualização otimista do cache
      queryClient.setQueryData(
        CACHE_KEYS.vaults,
        (oldData: Vault[] | undefined) => {
          if (!oldData) return oldData;

          return oldData.map((vault) => {
            const wordIndex = vault.words.findIndex(
              (word) => word.id === wordId
            );
            if (wordIndex !== -1) {
              const updatedWords = [...vault.words];
              updatedWords[wordIndex] = {
                ...updatedWords[wordIndex],
                ...data,
              };
              return {
                ...vault,
                words: updatedWords,
              };
            }
            return vault;
          });
        }
      );

      // Retornar contexto para rollback
      return { previousVaults };
    },
    onSuccess: (updatedWord) => {
      // Atualizar o cache com os dados reais do servidor
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

      // Invalidar apenas queries relacionadas específicas (sem refetch forçado)
      queryClient.invalidateQueries({
        queryKey: ["relatedWords"],
        refetchType: "none", // Não fazer refetch automático
      });
    },
    onError: (error, variables, context) => {
      // Rollback em caso de erro
      if (
        context &&
        typeof context === "object" &&
        "previousVaults" in context &&
        context.previousVaults
      ) {
        queryClient.setQueryData(CACHE_KEYS.vaults, context.previousVaults);
      }
      console.error("Erro ao atualizar palavra:", error);
    },
    onSettled: () => {
      // Garantir que o cache está sincronizado após sucesso ou erro
      queryClient.invalidateQueries({ queryKey: CACHE_KEYS.vaults });
    },
  });
}

// Hook para buscar vault específico com cache
export function useVault(vaultId: number) {
  const { data: vaults } = useVaults();
  return vaults?.find((v) => v.id === vaultId);
}

// Hook para atualizações com debounce (útil para campos de texto)
export function useDebouncedUpdateWord(debounceMs: number = 500) {
  const queryClient = useQueryClient();

  return useDebouncedMutation({
    mutationFn: async ({
      wordId,
      data,
    }: {
      wordId: number;
      data: Partial<Word>;
    }) => {
      return await updateWord(wordId, data);
    },
    debounceMs,
    onMutate: async ({ wordId, data }) => {
      // Cancelar queries em andamento para evitar conflitos
      await queryClient.cancelQueries({ queryKey: CACHE_KEYS.vaults });

      // Snapshot do estado anterior para rollback
      const previousVaults = queryClient.getQueryData(CACHE_KEYS.vaults);

      // Atualização otimista do cache
      queryClient.setQueryData(
        CACHE_KEYS.vaults,
        (oldData: Vault[] | undefined) => {
          if (!oldData) return oldData;

          return oldData.map((vault) => {
            const wordIndex = vault.words.findIndex(
              (word) => word.id === wordId
            );
            if (wordIndex !== -1) {
              const updatedWords = [...vault.words];
              updatedWords[wordIndex] = {
                ...updatedWords[wordIndex],
                ...data,
              };
              return {
                ...vault,
                words: updatedWords,
              };
            }
            return vault;
          });
        }
      );

      return { previousVaults };
    },
    onSuccess: (updatedWord) => {
      // Atualizar o cache com os dados reais do servidor
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
    },
    onError: (error, variables, context) => {
      // Rollback em caso de erro
      if (
        context &&
        typeof context === "object" &&
        "previousVaults" in context &&
        context.previousVaults
      ) {
        queryClient.setQueryData(CACHE_KEYS.vaults, context.previousVaults);
      }
      console.error("Erro ao atualizar palavra:", error);
    },
  });
}
