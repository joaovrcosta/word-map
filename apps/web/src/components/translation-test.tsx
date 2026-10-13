"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { translateToPortuguese, translateDefinitions } from "@/lib/translate";

export default function TranslationTest() {
  const [inputText, setInputText] = useState("");
  const [inputDefinitions, setInputDefinitions] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [translatedDefinitions, setTranslatedDefinitions] = useState<string[]>(
    []
  );
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isLoadingDefinitions, setIsLoadingDefinitions] = useState(false);
  const [error, setError] = useState("");

  const handleTranslateText = async () => {
    if (!inputText.trim()) return;

    setIsLoadingText(true);
    setError("");
    try {
      const result = await translateToPortuguese(inputText);
      setTranslatedText(result);
    } catch (err) {
      setError(`Erro ao traduzir texto: ${err}`);
    } finally {
      setIsLoadingText(false);
    }
  };

  const handleTranslateDefinitions = async () => {
    if (!inputDefinitions.trim()) return;

    setIsLoadingDefinitions(true);
    setError("");
    try {
      const definitions = inputDefinitions
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d);
      const result = await translateDefinitions(definitions);
      setTranslatedDefinitions(result);
    } catch (err) {
      setError(`Erro ao traduzir definições: ${err}`);
    } finally {
      setIsLoadingDefinitions(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-8">
        Teste de Tradução Automática
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teste de tradução de texto único */}
        <Card>
          <CardHeader>
            <CardTitle>Traduzir Texto Único</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Texto em Inglês:
              </label>
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Digite um texto em inglês..."
                className="w-full"
              />
            </div>
            <Button
              onClick={handleTranslateText}
              disabled={isLoadingText || !inputText.trim()}
              className="w-full"
            >
              {isLoadingText ? "Traduzindo..." : "Traduzir"}
            </Button>
            {translatedText && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tradução:
                </label>
                <div className="p-3 bg-gray-100 rounded-md">
                  {translatedText}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Teste de tradução de definições */}
        <Card>
          <CardHeader>
            <CardTitle>Traduzir Definições</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Definições em Inglês (separadas por vírgula):
              </label>
              <Textarea
                value={inputDefinitions}
                onChange={(e) => setInputDefinitions(e.target.value)}
                placeholder="Digite definições em inglês separadas por vírgula..."
                className="w-full"
                rows={3}
              />
            </div>
            <Button
              onClick={handleTranslateDefinitions}
              disabled={isLoadingDefinitions || !inputDefinitions.trim()}
              className="w-full"
            >
              {isLoadingDefinitions ? "Traduzindo..." : "Traduzir"}
            </Button>
            {translatedDefinitions.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Traduções:
                </label>
                <div className="space-y-2">
                  {translatedDefinitions.map((def, index) => (
                    <div
                      key={index}
                      className="p-2 bg-gray-100 rounded-md text-sm"
                    >
                      {def}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Exibição de erros */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700 font-medium">Erro:</p>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Informações sobre o sistema */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">
            Como Funciona a Tradução Automática
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 space-y-2">
          <p>
            • <strong>API Route Local:</strong> Usamos uma API route do Next.js
            para evitar problemas de CORS
          </p>
          <p>
            • <strong>Serviço LibreTranslate:</strong> API gratuita e de código
            aberto para traduções
          </p>
          <p>
            • <strong>Fallback Seguro:</strong> Se a tradução falhar, o texto
            original é mantido
          </p>
          <p>
            • <strong>Detecção de Idioma:</strong> Apenas textos em inglês são
            traduzidos automaticamente
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
