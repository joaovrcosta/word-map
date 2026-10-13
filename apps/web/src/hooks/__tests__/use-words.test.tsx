import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import {
  useVaults,
  useWords,
  useUpdateWord,
  useVault,
  useDebouncedUpdateWord,
} from "../use-words";
import { getVaults, updateWord } from "@/actions/actions";
import { useDebouncedMutation } from "../use-debounced-mutation";

// Mock das dependências
jest.mock("@/actions/actions", () => ({
  getVaults: jest.fn(),
  updateWord: jest.fn(),
}));

jest.mock("../use-debounced-mutation", () => ({
  useDebouncedMutation: jest.fn(),
}));

const mockGetVaults = getVaults as jest.MockedFunction<typeof getVaults>;
const mockUpdateWord = updateWord as jest.MockedFunction<typeof updateWord>;
const mockUseDebouncedMutation = useDebouncedMutation as jest.MockedFunction<
  typeof useDebouncedMutation
>;

// Helper para criar QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useWords Hooks", () => {
  const mockVaults = [
    {
      id: 1,
      name: "Vault 1",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      words: [
        {
          id: 1,
          name: "hello",
          grammaticalClass: "interjection",
          category: "greeting",
          translations: ["olá", "oi"],
          confidence: 3,
          isSaved: true,
          vaultId: 1,
        },
        {
          id: 2,
          name: "goodbye",
          grammaticalClass: "interjection",
          category: "greeting",
          translations: ["tchau", "até logo"],
          confidence: 2,
          isSaved: true,
          vaultId: 1,
        },
      ],
    },
    {
      id: 2,
      name: "Vault 2",
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      words: [
        {
          id: 3,
          name: "thanks",
          grammaticalClass: "interjection",
          category: "greeting",
          translations: ["obrigado", "valeu"],
          confidence: 4,
          isSaved: true,
          vaultId: 2,
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("useVaults", () => {
    it("deve buscar vaults com sucesso", async () => {
      mockGetVaults.mockResolvedValue(mockVaults);

      const { result } = renderHook(() => useVaults(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockVaults);
      expect(result.current.error).toBeNull();
    });

    it("deve lidar com erro ao buscar vaults", async () => {
      const error = new Error("Failed to fetch vaults");
      mockGetVaults.mockRejectedValue(error);

      const { result } = renderHook(() => useVaults(), {
        wrapper: createWrapper(),
      });

      // Aguardar um tempo para o erro ser processado
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(result.current.data).toBeUndefined();
    });

    it("deve mostrar loading inicial", () => {
      mockGetVaults.mockImplementation(() => new Promise(() => {})); // Promise que nunca resolve

      const { result } = renderHook(() => useVaults(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe("useWords", () => {
    it("deve retornar palavras do vault específico", async () => {
      mockGetVaults.mockResolvedValue(mockVaults);

      const { result } = renderHook(() => useWords(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.vaults).toEqual(mockVaults);
      expect(result.current.currentVault).toEqual(mockVaults[0]);
      expect(result.current.words).toEqual(mockVaults[0].words);
    });

    it("deve retornar palavras do primeiro vault se nenhum vaultId for especificado", async () => {
      mockGetVaults.mockResolvedValue(mockVaults);

      const { result } = renderHook(() => useWords(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentVault).toEqual(mockVaults[0]);
      expect(result.current.words).toEqual(mockVaults[0].words);
    });

    it("deve retornar array vazio se vault não for encontrado", async () => {
      mockGetVaults.mockResolvedValue(mockVaults);

      const { result } = renderHook(() => useWords(999), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentVault).toBeUndefined();
      expect(result.current.words).toEqual([]);
    });

    it("deve lidar com erro ao buscar palavras", async () => {
      const error = new Error("Failed to fetch vaults");
      mockGetVaults.mockRejectedValue(error);

      const { result } = renderHook(() => useWords(1), {
        wrapper: createWrapper(),
      });

      // Aguardar um tempo para o erro ser processado
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(result.current.words).toEqual([]);
    });
  });

  describe("useVault", () => {
    it("deve retornar vault específico", async () => {
      mockGetVaults.mockResolvedValue(mockVaults);

      const { result } = renderHook(() => useVault(1), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toEqual(mockVaults[0]);
      });
    });

    it("deve retornar undefined se vault não for encontrado", async () => {
      mockGetVaults.mockResolvedValue(mockVaults);

      const { result } = renderHook(() => useVault(999), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current).toBeUndefined();
      });
    });
  });

  describe("useUpdateWord", () => {
    it("deve atualizar palavra com sucesso", async () => {
      const updatedWord = {
        id: 1,
        name: "hello",
        grammaticalClass: "interjection",
        category: "greeting",
        translations: ["olá", "oi", "e aí"],
        confidence: 4,
        isSaved: true,
        vaultId: 1,
      };

      mockGetVaults.mockResolvedValue(mockVaults);
      mockUpdateWord.mockResolvedValue(updatedWord);

      const { result } = renderHook(() => useUpdateWord(), {
        wrapper: createWrapper(),
      });

      // Primeiro, carregar os dados
      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });

      // Executar mutação
      act(() => {
        result.current.mutate({
          wordId: 1,
          data: { translations: ["olá", "oi", "e aí"], confidence: 4 },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdateWord).toHaveBeenCalledWith(1, {
        translations: ["olá", "oi", "e aí"],
        confidence: 4,
      });
    });

    it("deve lidar com erro ao atualizar palavra", async () => {
      const error = new Error("Failed to update word");
      mockGetVaults.mockResolvedValue(mockVaults);
      mockUpdateWord.mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateWord(), {
        wrapper: createWrapper(),
      });

      // Primeiro, carregar os dados
      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });

      // Executar mutação
      act(() => {
        result.current.mutate({
          wordId: 1,
          data: { confidence: 4 },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe("useDebouncedUpdateWord", () => {
    it("deve usar useDebouncedMutation", () => {
      const mockMutation = {
        mutate: jest.fn(),
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
      };

      mockUseDebouncedMutation.mockReturnValue(mockMutation);

      const { result } = renderHook(() => useDebouncedUpdateWord(500), {
        wrapper: createWrapper(),
      });

      expect(mockUseDebouncedMutation).toHaveBeenCalledWith({
        mutationFn: expect.any(Function),
        debounceMs: 500,
        onMutate: expect.any(Function),
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      });

      expect(result.current).toEqual(mockMutation);
    });

    it("deve usar delay padrão de 500ms", () => {
      const mockMutation = {
        mutate: jest.fn(),
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
      };

      mockUseDebouncedMutation.mockReturnValue(mockMutation);

      renderHook(() => useDebouncedUpdateWord(), {
        wrapper: createWrapper(),
      });

      expect(mockUseDebouncedMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          debounceMs: 500,
        })
      );
    });

    it("deve usar delay customizado", () => {
      const mockMutation = {
        mutate: jest.fn(),
        isPending: false,
        isSuccess: false,
        isError: false,
        error: null,
      };

      mockUseDebouncedMutation.mockReturnValue(mockMutation);

      renderHook(() => useDebouncedUpdateWord(1000), {
        wrapper: createWrapper(),
      });

      expect(mockUseDebouncedMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          debounceMs: 1000,
        })
      );
    });
  });
});
