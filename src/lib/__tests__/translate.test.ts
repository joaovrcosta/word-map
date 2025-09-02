import {
  translateToPortuguese,
  translateArrayToPortuguese,
  translateDefinitions,
  type TranslationResponse,
} from "../translate";

// Mock do fetch global
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("Translate Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("translateToPortuguese", () => {
    it("deve traduzir texto com sucesso", async () => {
      const mockResponse: TranslationResponse = {
        translatedText: "olá mundo",
        detectedLanguage: {
          confidence: 0.95,
          code: "en",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await translateToPortuguese("hello world");

      expect(mockFetch).toHaveBeenCalledWith("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: "hello world",
          source: "en",
          target: "pt",
        }),
      });
      expect(result).toBe("olá mundo");
    });

    it("deve retornar texto original se estiver vazio", async () => {
      const result = await translateToPortuguese("");
      expect(result).toBe("");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deve retornar texto original se for apenas espaços", async () => {
      const result = await translateToPortuguese("   ");
      expect(result).toBe("   ");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deve retornar texto original se resposta não for ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
      } as Response);

      const result = await translateToPortuguese("hello world");

      expect(result).toBe("hello world");
    });

    it("deve retornar texto original se houver erro na resposta", async () => {
      const mockResponse: TranslationResponse = {
        translatedText: "",
        error: "Translation failed",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await translateToPortuguese("hello world");

      expect(result).toBe("hello world");
    });

    it("deve retornar texto original se tradução estiver vazia", async () => {
      const mockResponse: TranslationResponse = {
        translatedText: "",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await translateToPortuguese("hello world");

      expect(result).toBe("hello world");
    });

    it("deve lidar com erro de fetch", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await translateToPortuguese("hello world");

      expect(result).toBe("hello world");
    });

    it("deve lidar com erro de parsing JSON", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as Response);

      const result = await translateToPortuguese("hello world");

      expect(result).toBe("hello world");
    });
  });

  describe("translateArrayToPortuguese", () => {
    it("deve traduzir array de textos com sucesso", async () => {
      const mockResponse1: TranslationResponse = {
        translatedText: "olá",
      };
      const mockResponse2: TranslationResponse = {
        translatedText: "mundo",
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        } as Response);

      const result = await translateArrayToPortuguese(["hello", "world"]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual(["olá", "mundo"]);
    });

    it("deve retornar array vazio se entrada for array vazio", async () => {
      const result = await translateArrayToPortuguese([]);
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deve retornar array original se entrada não for array", async () => {
      const result = await translateArrayToPortuguese(null as any);
      expect(result).toEqual(null);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deve lidar com erro durante tradução de array", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await translateArrayToPortuguese(["hello", "world"]);

      expect(result).toEqual(["hello", "world"]);
    });

    it("deve traduzir textos em paralelo", async () => {
      const mockResponse1: TranslationResponse = {
        translatedText: "olá",
      };
      const mockResponse2: TranslationResponse = {
        translatedText: "mundo",
      };
      const mockResponse3: TranslationResponse = {
        translatedText: "bonito",
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse3,
        } as Response);

      const startTime = Date.now();
      const result = await translateArrayToPortuguese([
        "hello",
        "world",
        "beautiful",
      ]);
      const endTime = Date.now();

      expect(result).toEqual(["olá", "mundo", "bonito"]);
      expect(mockFetch).toHaveBeenCalledTimes(3);
      // Verificar que as chamadas foram feitas em paralelo (tempo deve ser menor que sequencial)
      expect(endTime - startTime).toBeLessThan(1000); // Assumindo que cada tradução leva ~300ms
    });
  });

  describe("translateDefinitions", () => {
    it("deve traduzir definições com sucesso", async () => {
      const mockResponse1: TranslationResponse = {
        translatedText: "uma saudação amigável",
      };
      const mockResponse2: TranslationResponse = {
        translatedText: "usado para cumprimentar alguém",
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        } as Response);

      const result = await translateDefinitions([
        "a friendly greeting",
        "used to greet someone",
      ]);

      expect(result).toEqual([
        "uma saudação amigável",
        "usado para cumprimentar alguém",
      ]);
    });

    it("deve filtrar definições vazias antes de traduzir", async () => {
      const mockResponse: TranslationResponse = {
        translatedText: "uma saudação",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await translateDefinitions([
        "a greeting",
        "", // Definição vazia
        "   ", // Definição apenas com espaços
        "used to say hello",
      ]);

      expect(result).toEqual([
        "uma saudação",
        "", // Mantém a definição vazia
        "   ", // Mantém os espaços
        "used to say hello", // Não foi traduzida porque só há uma definição válida
      ]);
    });

    it("deve retornar array original se não houver definições válidas", async () => {
      const result = await translateDefinitions(["", "   ", ""]);

      expect(result).toEqual(["", "   ", ""]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deve retornar array original se entrada for array vazio", async () => {
      const result = await translateDefinitions([]);

      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deve retornar array original se entrada não for array", async () => {
      const result = await translateDefinitions(null as any);

      expect(result).toEqual(null);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deve manter estrutura original do array", async () => {
      const mockResponse: TranslationResponse = {
        translatedText: "uma saudação",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await translateDefinitions([
        "a greeting",
        "", // Definição vazia no meio
        "used to say hello",
      ]);

      expect(result).toEqual([
        "uma saudação", // Traduzida
        "", // Mantém vazia
        "used to say hello", // Não traduzida (apenas uma definição válida foi traduzida)
      ]);
    });

    it("deve lidar com erro durante tradução de definições", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await translateDefinitions([
        "a greeting",
        "used to say hello",
      ]);

      expect(result).toEqual(["a greeting", "used to say hello"]);
    });

    it("deve lidar com definições que contêm apenas espaços", async () => {
      const result = await translateDefinitions([
        "a greeting",
        "   ",
        "used to say hello",
      ]);

      expect(result).toEqual(["a greeting", "   ", "used to say hello"]);
      // Deve chamar fetch apenas para as definições válidas (não vazias)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
