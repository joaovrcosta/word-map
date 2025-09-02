import { NextRequest } from "next/server";
import { POST } from "../route";

// Mock NextRequest
jest.mock("next/server", () => ({
  NextRequest: class MockNextRequest {
    constructor(url, init) {
      this.url = url;
      this.init = init;
    }
    async json() {
      return JSON.parse(this.init?.body || "{}");
    }
    async text() {
      return this.init?.body || "";
    }
  },
  NextResponse: {
    json: (data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      statusText: init?.statusText || "OK",
    }),
  },
}));

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("/api/translate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("deve traduzir texto com sucesso", async () => {
      const mockGoogleResponse = [
        [
          [
            "olá mundo",
            "hello world",
            null,
            null,
            0,
            0,
            0,
            null,
            [[[1, "hello world"]]],
            [["hello world"]],
          ],
        ],
        null,
        "en",
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockGoogleResponse,
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/translate", {
        method: "POST",
        body: JSON.stringify({
          text: "hello world",
          source: "en",
          target: "pt",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        translatedText: "olá mundo",
        detectedLanguage: { code: "en", confidence: 1 },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=hello%20world",
        {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        }
      );
    });

    it("deve usar valores padrão para source e target", async () => {
      const mockGoogleResponse = [
        [
          [
            "olá",
            "hello",
            null,
            null,
            0,
            0,
            0,
            null,
            [[[1, "hello"]]],
            [["hello"]],
          ],
        ],
        null,
        "en",
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockGoogleResponse,
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/translate", {
        method: "POST",
        body: JSON.stringify({
          text: "hello",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.translatedText).toBe("olá");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=hello",
        expect.any(Object)
      );
    });

    it("deve retornar erro 400 se texto não for fornecido", async () => {
      const request = new NextRequest("http://localhost:3000/api/translate", {
        method: "POST",
        body: JSON.stringify({
          source: "en",
          target: "pt",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: "Texto para tradução é obrigatório",
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deve retornar erro 400 se texto for vazio", async () => {
      const request = new NextRequest("http://localhost:3000/api/translate", {
        method: "POST",
        body: JSON.stringify({
          text: "",
          source: "en",
          target: "pt",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: "Texto para tradução é obrigatório",
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deve retornar erro se Google Translate falhar", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/translate", {
        method: "POST",
        body: JSON.stringify({
          text: "hello world",
          source: "en",
          target: "pt",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data).toEqual({
        error: "Erro no serviço de tradução",
      });
    });

    it("deve lidar com resposta malformada do Google Translate", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => null, // Resposta inválida
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/translate", {
        method: "POST",
        body: JSON.stringify({
          text: "hello world",
          source: "en",
          target: "pt",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      // Quando a resposta é null, o código vai para o catch e retorna 500
      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: "Erro interno do servidor",
      });
    });

    it("deve lidar com estrutura de resposta incompleta", async () => {
      const mockGoogleResponse = [
        [
          [
            "olá mundo",
            "hello world",
            null,
            null,
            0,
            0,
            0,
            null,
            [[[1, "hello world"]]],
            [["hello world"]],
          ],
        ],
        null,
        // Sem o terceiro elemento (detected language)
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockGoogleResponse,
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/translate", {
        method: "POST",
        body: JSON.stringify({
          text: "hello world",
          source: "en",
          target: "pt",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        translatedText: "olá mundo",
        detectedLanguage: undefined,
      });
    });

    it("deve lidar com erro de rede", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const request = new NextRequest("http://localhost:3000/api/translate", {
        method: "POST",
        body: JSON.stringify({
          text: "hello world",
          source: "en",
          target: "pt",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: "Erro interno do servidor",
      });
    });

    it("deve lidar com erro de parsing JSON", async () => {
      const request = new NextRequest("http://localhost:3000/api/translate", {
        method: "POST",
        body: "invalid json",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        error: "Erro interno do servidor",
      });
    });

    it("deve lidar com texto com caracteres especiais", async () => {
      const mockGoogleResponse = [
        [
          [
            "olá, mundo!",
            "hello, world!",
            null,
            null,
            0,
            0,
            0,
            null,
            [[[1, "hello, world!"]]],
            [["hello, world!"]],
          ],
        ],
        null,
        "en",
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockGoogleResponse,
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/translate", {
        method: "POST",
        body: JSON.stringify({
          text: "hello, world!",
          source: "en",
          target: "pt",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.translatedText).toBe("olá, mundo!");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=hello%2C%20world!",
        expect.any(Object)
      );
    });

    it("deve lidar com texto longo", async () => {
      const longText =
        "This is a very long text that needs to be translated to Portuguese. ".repeat(
          10
        );
      const mockGoogleResponse = [
        [
          [
            "Este é um texto muito longo que precisa ser traduzido para o português. ".repeat(
              10
            ),
            longText,
            null,
            null,
            0,
            0,
            0,
            null,
            [[[1, longText]]],
            [[longText]],
          ],
        ],
        null,
        "en",
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockGoogleResponse,
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/translate", {
        method: "POST",
        body: JSON.stringify({
          text: longText,
          source: "en",
          target: "pt",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.translatedText).toBe(
        "Este é um texto muito longo que precisa ser traduzido para o português. ".repeat(
          10
        )
      );
    });

    it("deve lidar com diferentes idiomas", async () => {
      const mockGoogleResponse = [
        [
          [
            "hello",
            "hola",
            null,
            null,
            0,
            0,
            0,
            null,
            [[[1, "hola"]]],
            [["hola"]],
          ],
        ],
        null,
        "es",
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => mockGoogleResponse,
      } as Response);

      const request = new NextRequest("http://localhost:3000/api/translate", {
        method: "POST",
        body: JSON.stringify({
          text: "hola",
          source: "es",
          target: "en",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.translatedText).toBe("hello");
      expect(data.detectedLanguage.code).toBe("es");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=en&dt=t&q=hola",
        expect.any(Object)
      );
    });
  });
});
