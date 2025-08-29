"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getVaults, getAllWordRelations } from "@/actions/actions";
import { Vault, Word } from "@/actions/actions";
import { Network, Link, Filter, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MindMapView from "@/components/MindMapView";

interface ConnectedWord {
  id: number;
  name: string;
  grammaticalClass: string;
  translations: string[];
  confidence: number;
  vaultId: number;
  vaultName: string;
  connections: number;
}

interface WordConnection {
  wordA: Word;
  wordB: Word;
  vaultA: string;
  vaultB: string;
}

export default function ConnectionsPage() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVault, setSelectedVault] = useState<string>("all");
  const [connectedWords, setConnectedWords] = useState<ConnectedWord[]>([]);
  const [wordConnections, setWordConnections] = useState<WordConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "network" | "mindmap">(
    "list"
  );
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [selectedVault]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [vaultsData, relatedWordsData] = await Promise.all([
        getVaults(),
        getAllWordRelations(),
      ]);

      setVaults(vaultsData);

      // Processar palavras conectadas
      const connectedWordsMap = new Map<number, ConnectedWord>();
      const connectionsMap = new Map<string, WordConnection>();

      // Processar relacionamentos
      relatedWordsData.forEach((relation) => {
        const wordA = relation.wordA;
        const wordB = relation.wordB;

        // Adicionar à lista de palavras conectadas
        if (!connectedWordsMap.has(wordA.id)) {
          const vaultA = vaultsData.find((v) => v.id === wordA.vaultId);
          connectedWordsMap.set(wordA.id, {
            ...wordA,
            vaultName: vaultA?.name || "Vault não encontrado",
            connections: 0,
          });
        }

        if (!connectedWordsMap.has(wordB.id)) {
          const vaultB = vaultsData.find((v) => v.id === wordB.vaultId);
          connectedWordsMap.set(wordB.id, {
            ...wordB,
            vaultName: vaultB?.name || "Vault não encontrado",
            connections: 0,
          });
        }

        // Incrementar contador de conexões
        const wordAEntry = connectedWordsMap.get(wordA.id)!;
        const wordBEntry = connectedWordsMap.get(wordB.id)!;
        wordAEntry.connections++;
        wordBEntry.connections++;

        // Adicionar conexão
        const connectionKey = `${Math.min(wordA.id, wordB.id)}-${Math.max(
          wordA.id,
          wordB.id
        )}`;
        if (!connectionsMap.has(connectionKey)) {
          const vaultA = vaultsData.find((v) => v.id === wordA.vaultId);
          const vaultB = vaultsData.find((v) => v.id === wordB.vaultId);
          connectionsMap.set(connectionKey, {
            wordA,
            wordB,
            vaultA: vaultA?.name || "Vault não encontrado",
            vaultB: vaultB?.name || "Vault não encontrado",
          });
        }
      });

      // Filtrar por vault selecionado
      let filteredWords = Array.from(connectedWordsMap.values());
      if (selectedVault !== "all") {
        const vaultId = parseInt(selectedVault);
        filteredWords = filteredWords.filter(
          (word) => word.vaultId === vaultId
        );
      }

      // Ordenar por número de conexões
      filteredWords.sort((a, b) => b.connections - a.connections);

      setConnectedWords(filteredWords);
      setWordConnections(Array.from(connectionsMap.values()));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as conexões entre palavras",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const getConnectionStrength = (connections: number) => {
    if (connections >= 5) return "bg-red-500";
    if (connections >= 3) return "bg-orange-500";
    if (connections >= 2) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getConnectionText = (connections: number) => {
    if (connections >= 5) return "Muito Forte";
    if (connections >= 3) return "Forte";
    if (connections >= 2) return "Média";
    return "Fraca";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg text-gray-600">Carregando conexões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Network className="w-8 h-8 text-blue-600" />
            Mapa de Conexões
          </h1>
          <p className="text-gray-600 mt-2">
            Visualize como as palavras estão conectadas entre si nos seus vaults
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </Button>
      </div>

      {/* Filtros e Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros e Visualização
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Vault:</label>
              <Select value={selectedVault} onValueChange={setSelectedVault}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecione um vault" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Vaults</SelectItem>
                  {vaults.map((vault) => (
                    <SelectItem key={vault.id} value={vault.id.toString()}>
                      {vault.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Visualização:</label>
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-r-none"
                >
                  Lista
                </Button>
                <Button
                  variant={viewMode === "network" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("network")}
                  className="rounded-l-none rounded-r-none"
                >
                  Rede
                </Button>
                <Button
                  variant={viewMode === "mindmap" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("mindmap")}
                  className="rounded-l-none"
                >
                  Mapa Mental
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {connectedWords.length}
              </div>
              <div className="text-sm text-blue-600">Palavras Conectadas</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {wordConnections.length}
              </div>
              <div className="text-sm text-green-600">Conexões</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {
                  vaults.filter((v) =>
                    connectedWords.some((w) => w.vaultId === v.id)
                  ).length
                }
              </div>
              <div className="text-sm text-purple-600">Vaults com Conexões</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {connectedWords.reduce(
                  (sum, word) => sum + word.connections,
                  0
                ) / 2}
              </div>
              <div className="text-sm text-orange-600">
                Total de Relacionamentos
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualização de Lista */}
      {viewMode === "list" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-green-600" />
              Palavras Conectadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectedWords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Network className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">
                  Nenhuma palavra conectada encontrada
                </p>
                <p className="text-sm">
                  Comece a conectar palavras nos seus vaults para ver as
                  relações aqui
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {connectedWords.map((word) => (
                  <div
                    key={word.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          {word.name}
                        </Badge>
                        <Badge variant="secondary" className="text-sm">
                          {word.grammaticalClass}
                        </Badge>
                        <Badge
                          className={`text-sm ${getConnectionStrength(
                            word.connections
                          )}`}
                        >
                          {getConnectionText(word.connections)}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {word.connections}
                        </div>
                        <div className="text-xs text-gray-500">conexões</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-600 mb-1">
                          Traduções:
                        </div>
                        <div className="text-sm text-gray-800">
                          {word.translations.length > 0
                            ? word.translations.join(", ")
                            : "Nenhuma tradução"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-600 mb-1">
                          Vault:
                        </div>
                        <div className="text-sm text-gray-800">
                          {word.vaultName}
                        </div>
                        <div className="text-sm text-gray-500">
                          Nível {word.confidence}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Visualização de Rede */}
      {viewMode === "network" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5 text-purple-600" />
              Rede de Conexões
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wordConnections.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Network className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">
                  Nenhuma conexão encontrada
                </p>
                <p className="text-sm">
                  Conecte palavras nos seus vaults para visualizar a rede
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {wordConnections.map((connection, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50"
                  >
                    <div className="flex items-center justify-center mb-3">
                      <div className="text-center">
                        <div className="text-sm text-gray-500 mb-1">
                          Conexão
                        </div>
                        <Link className="w-6 h-6 text-blue-600 mx-auto" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Palavra A */}
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <Badge variant="outline" className="text-lg mb-2">
                          {connection.wordA.name}
                        </Badge>
                        <div className="text-sm text-gray-600 mb-1">
                          {connection.wordA.grammaticalClass}
                        </div>
                        <div className="text-xs text-gray-500">
                          {connection.vaultA}
                        </div>
                        <div className="text-xs text-gray-400">
                          Nível {connection.wordA.confidence}
                        </div>
                      </div>

                      {/* Palavra B */}
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <Badge variant="outline" className="text-lg mb-2">
                          {connection.wordB.name}
                        </Badge>
                        <div className="text-sm text-gray-600 mb-1">
                          {connection.wordB.grammaticalClass}
                        </div>
                        <div className="text-xs text-gray-500">
                          {connection.vaultB}
                        </div>
                        <div className="text-xs text-gray-400">
                          Nível {connection.wordB.confidence}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-center">
                      <div className="text-xs text-gray-500">
                        Relacionadas via:{" "}
                        {connection.wordA.translations[0] || "Sem tradução"} ↔{" "}
                        {connection.wordB.translations[0] || "Sem tradução"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Visualização de Mapa Mental */}
      {viewMode === "mindmap" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5 text-purple-600" />
              Mapa Mental das Conexões
            </CardTitle>
          </CardHeader>
          <CardContent>
            {wordConnections.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Network className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">
                  Nenhuma conexão encontrada
                </p>
                <p className="text-sm">
                  Conecte palavras nos seus vaults para visualizar o mapa mental
                </p>
              </div>
            ) : (
              <div className="relative min-h-[600px] overflow-auto">
                <MindMapView
                  connections={wordConnections}
                  selectedVault={selectedVault}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
