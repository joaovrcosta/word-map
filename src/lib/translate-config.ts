/**
 * Configuração para APIs de tradução
 * Permite fácil mudança entre diferentes serviços de tradução
 */

export interface TranslationServiceConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  isFree: boolean;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

// Configurações dos serviços de tradução disponíveis
export const TRANSLATION_SERVICES: Record<string, TranslationServiceConfig> = {
  libreTranslate: {
    name: "LibreTranslate",
    baseUrl: "https://libretranslate.de/translate",
    isFree: true,
    rateLimit: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
    },
  },
  libreTranslateAlt: {
    name: "LibreTranslate (Alternativo)",
    baseUrl: "https://translate.argosopentech.com/translate",
    isFree: true,
    rateLimit: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
    },
  },
  // Adicionar outros serviços conforme necessário
  // googleTranslate: {
  //   name: "Google Translate",
  //   baseUrl: "https://translation.googleapis.com/language/translate/v2",
  //   apiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
  //   isFree: false,
  //   rateLimit: {
  //     requestsPerMinute: 1000,
  //     requestsPerHour: 100000,
  //   },
  // },
};

// Serviço padrão
export const DEFAULT_TRANSLATION_SERVICE = "libreTranslate";

// Obter configuração do serviço ativo
export function getActiveTranslationService(): TranslationServiceConfig {
  const serviceName =
    process.env.NEXT_PUBLIC_TRANSLATION_SERVICE || DEFAULT_TRANSLATION_SERVICE;
  return (
    TRANSLATION_SERVICES[serviceName] ||
    TRANSLATION_SERVICES[DEFAULT_TRANSLATION_SERVICE]
  );
}

// Verificar se o serviço está disponível
export function isTranslationServiceAvailable(serviceName: string): boolean {
  return serviceName in TRANSLATION_SERVICES;
}

// Listar todos os serviços disponíveis
export function getAvailableTranslationServices(): TranslationServiceConfig[] {
  return Object.values(TRANSLATION_SERVICES);
}
