# Tradução Automática de Definições

## Visão Geral

Esta funcionalidade traduz automaticamente as definições das palavras do inglês para português quando você salva palavras no cofre. Isso garante que todas as definições estejam em português, facilitando o estudo e compreensão.

## Como Funciona

### 1. **Busca de Palavras na API**

- Quando você busca uma palavra em inglês, o sistema consulta a API do dicionário (dictionaryapi.dev)
- As definições são obtidas em inglês

### 2. **Tradução Automática**

- Antes de salvar no cofre, as definições são automaticamente traduzidas para português
- Usa a API gratuita do LibreTranslate para realizar as traduções
- Se a tradução falhar, as definições originais em inglês são mantidas

### 3. **Salvamento no Cofre**

- As palavras são salvas com as definições já traduzidas para português
- Mantém a estrutura original da palavra (nome, classe gramatical, categoria, etc.)

## Onde a Tradução é Aplicada

### ✅ **Busca de Palavras** (`search-word.tsx`)

- Palavras encontradas na API do dicionário
- Definições são traduzidas antes de salvar no cofre

### ✅ **Visualizador de Textos** (`text-viewer.tsx`)

- Palavras extraídas de textos
- Definições da API são traduzidas automaticamente

### ✅ **Criação Manual de Palavras** (`home/page.tsx`)

- Traduções digitadas manualmente em inglês são traduzidas para português
- Detecta automaticamente se o texto está em inglês

### ✅ **Edição de Palavras** (`edit-word-dialog.tsx`)

- Traduções modificadas em inglês são traduzidas ao salvar

### ✅ **Importação de Palavras** (`import-export-words.tsx`)

- Palavras importadas de arquivos JSON
- Traduções em inglês são traduzidas automaticamente

## Configuração

### Serviço de Tradução Padrão

- **LibreTranslate**: API gratuita e de código aberto
- **URL**: https://libretranslate.de/translate
- **Limite**: 10 requisições por minuto, 100 por hora

### Variáveis de Ambiente

```env
# Opcional: especificar serviço de tradução
NEXT_PUBLIC_TRANSLATION_SERVICE=libreTranslate
```

### Adicionar Novos Serviços

Para adicionar outros serviços de tradução, edite `src/lib/translate-config.ts`:

```typescript
export const TRANSLATION_SERVICES: Record<string, TranslationServiceConfig> = {
  libreTranslate: {
    /* configuração atual */
  },
  googleTranslate: {
    name: "Google Translate",
    baseUrl: "https://translation.googleapis.com/language/translate/v2",
    apiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
    isFree: false,
    rateLimit: { requestsPerMinute: 1000, requestsPerHour: 100000 },
  },
};
```

## Detecção de Idioma

O sistema detecta automaticamente se o texto está em inglês usando uma regex simples:

```typescript
const isEnglish = /^[a-zA-Z\s\-']+$/.test(text);
```

- **Caracteres permitidos**: letras (a-z, A-Z), espaços, hífens, apóstrofos
- **Se for inglês**: traduz automaticamente
- **Se não for inglês**: mantém o texto original

## Tratamento de Erros

### Falha na Tradução

- Se a API de tradução falhar, as definições originais são mantidas
- Logs de aviso são exibidos no console
- A funcionalidade principal não é interrompida

### Rate Limiting

- O LibreTranslate tem limites de requisições
- Em caso de exceder o limite, aguarde alguns minutos

## Teste da Funcionalidade

Use o componente `TranslationTest` para verificar se a tradução está funcionando:

```tsx
import { TranslationTest } from "@/components/translation-test";

// Em qualquer página
<TranslationTest />;
```

## Benefícios

1. **Aprendizado em Português**: Todas as definições ficam em português
2. **Automatização**: Não precisa traduzir manualmente cada definição
3. **Consistência**: Padrão uniforme para todas as palavras do cofre
4. **Gratuito**: Usa APIs gratuitas de tradução
5. **Fallback**: Mantém definições originais se a tradução falhar

## Limitações

1. **Dependência de API Externa**: Requer conexão com internet
2. **Rate Limiting**: Limites de requisições por hora
3. **Qualidade da Tradução**: Depende da qualidade do serviço de tradução
4. **Detecção de Idioma**: Regex simples pode ter falsos positivos

## Solução de Problemas

### Tradução não funciona

1. Verifique a conexão com a internet
2. Teste com o componente `TranslationTest`
3. Verifique os logs do console para erros
4. Aguarde alguns minutos se excedeu o limite de requisições

### Traduções incorretas

1. A API pode não traduzir corretamente termos técnicos
2. Contexto pode ser perdido na tradução
3. Considere editar manualmente traduções problemáticas

### Performance

1. Traduções são feitas em paralelo para melhor performance
2. Cache do React Query evita traduções repetidas
3. Fallback para texto original em caso de erro
