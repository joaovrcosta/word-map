import { useCallback, useRef } from "react";
import { useMutation, UseMutationOptions } from "@tanstack/react-query";

interface UseDebouncedMutationOptions<TData, TError, TVariables>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, "mutationFn"> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  debounceMs?: number;
}

export function useDebouncedMutation<TData, TError, TVariables>({
  mutationFn,
  debounceMs = 300,
  ...options
}: UseDebouncedMutationOptions<TData, TError, TVariables>) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pendingVariablesRef = useRef<TVariables | undefined>(undefined);

  const mutation = useMutation({
    mutationFn,
    ...options,
  });

  const debouncedMutate = useCallback(
    (variables: TVariables) => {
      // Cancelar timeout anterior se existir
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Armazenar as variáveis pendentes
      pendingVariablesRef.current = variables;

      // Criar novo timeout
      timeoutRef.current = setTimeout(() => {
        if (pendingVariablesRef.current) {
          mutation.mutate(pendingVariablesRef.current);
        }
      }, debounceMs);
    },
    [mutation, debounceMs]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    pendingVariablesRef.current = undefined;
  }, []);

  return {
    ...mutation,
    debouncedMutate,
    cancel,
  };
}
