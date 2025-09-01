/**
 * Funções para tradução automática de inglês para português
 * Usando APIs de tradução configuráveis
 */

import { getActiveTranslationService } from "./translate-config";

export interface TranslationResponse {
  translatedText: string;
  detectedLanguage?: {
    confidence: number;
    code: string;
  };
  error?: string;
}

/**
 * Traduz texto do inglês para português
 * @param text - Texto em inglês para traduzir
 * @returns Texto traduzido em português
 */
export async function translateToPortuguese(text: string): Promise<string> {
  console.log("=== translateToPortuguese INÍCIO ===");
  console.log("Texto para traduzir:", text);

  if (!text || text.trim().length === 0) {
    console.log("Texto vazio, retornando original");
    return text;
  }

  try {
    console.log("Fazendo requisição para /api/translate...");
    // Usar nossa API route local para evitar problemas de CORS
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        source: "en",
        target: "pt",
      }),
    });

    if (!response.ok) {
      console.warn(
        "Erro na tradução, retornando texto original:",
        response.statusText
      );
      return text;
    }

    const data: TranslationResponse = await response.json();

    // Verificar se há erro na resposta
    if (data.error) {
      console.warn("Erro na tradução:", data.error);
      return text;
    }

    console.log("Tradução bem-sucedida:", data.translatedText);
    console.log("=== translateToPortuguese FIM ===");
    return data.translatedText || text;
  } catch (error) {
    console.warn("Erro ao traduzir texto, retornando original:", error);
    return text;
  }
}

/**
 * Traduz um array de textos do inglês para português
 * @param texts - Array de textos em inglês para traduzir
 * @returns Array de textos traduzidos em português
 */
export async function translateArrayToPortuguese(
  texts: string[]
): Promise<string[]> {
  if (!Array.isArray(texts) || texts.length === 0) {
    return texts;
  }

  try {
    // Traduzir todos os textos em paralelo para melhor performance
    const translationPromises = texts.map((text) =>
      translateToPortuguese(text)
    );
    const translatedTexts = await Promise.all(translationPromises);

    return translatedTexts;
  } catch (error) {
    console.warn(
      "Erro ao traduzir array de textos, retornando originais:",
      error
    );
    return texts;
  }
}

/**
 * Traduz definições de uma palavra da API do dicionário para português
 * @param definitions - Array de definições em inglês
 * @returns Array de definições traduzidas para português
 */
export async function translateDefinitions(
  definitions: string[]
): Promise<string[]> {
  console.log("=== translateDefinitions INÍCIO ===");
  console.log("Definições recebidas:", definitions);

  if (!Array.isArray(definitions) || definitions.length === 0) {
    console.log("Array vazio ou inválido, retornando original");
    return definitions;
  }

  try {
    // Filtrar definições vazias e traduzir
    const validDefinitions = definitions.filter(
      (def) => def && def.trim().length > 0
    );

    console.log("Definições válidas para tradução:", validDefinitions);

    if (validDefinitions.length === 0) {
      console.log("Nenhuma definição válida encontrada");
      return definitions;
    }

    console.log("Chamando translateArrayToPortuguese...");
    const translatedDefinitions = await translateArrayToPortuguese(
      validDefinitions
    );
    console.log("Resultado da tradução:", translatedDefinitions);

    // Manter a mesma estrutura do array original, substituindo apenas as definições válidas
    let translatedIndex = 0;
    const result = definitions.map((def) => {
      if (def && def.trim().length > 0) {
        return translatedDefinitions[translatedIndex++];
      }
      return def;
    });

    console.log("Resultado final:", result);
    console.log("=== translateDefinitions FIM ===");
    return result;
  } catch (error) {
    console.warn("Erro ao traduzir definições, retornando originais:", error);
    return definitions;
  }
}
