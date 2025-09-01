import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("=== API de Tradução - INÍCIO ===");

    const body = await request.json();
    const { text, source = "en", target = "pt" } = body;

    console.log("Dados recebidos:", { text, source, target });

    if (!text) {
      console.log("Erro: texto não fornecido");
      return NextResponse.json(
        { error: "Texto para tradução é obrigatório" },
        { status: 400 }
      );
    }

    // Usar Google Translate que é mais confiável
    console.log("Usando Google Translate...");

    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodedText}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    console.log("Resposta do Google Translate:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      console.warn("Erro na tradução:", response.statusText);
      return NextResponse.json(
        { error: "Erro no serviço de tradução" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Dados recebidos do Google Translate:", data);

    // Google Translate retorna um array complexo, extrair a tradução
    let translatedText = text; // fallback para o texto original

    if (data && Array.isArray(data) && data[0] && Array.isArray(data[0])) {
      // A estrutura é: [[["tradução", "texto original", ...], ...], ...]
      const translations = data[0];
      if (
        translations.length > 0 &&
        translations[0] &&
        Array.isArray(translations[0])
      ) {
        translatedText = translations[0][0] || text;
      }
    }

    const result = {
      translatedText: translatedText,
      detectedLanguage: data[2] ? { code: data[2], confidence: 1 } : undefined,
    };

    console.log("Resultado final:", result);
    console.log("=== API de Tradução - FIM ===");

    return NextResponse.json(result);
  } catch (error) {
    console.error("=== ERRO na API de Tradução ===");
    console.error("Tipo do erro:", typeof error);
    console.error("Erro completo:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "N/A");
    console.error("=== FIM ERRO ===");

    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
