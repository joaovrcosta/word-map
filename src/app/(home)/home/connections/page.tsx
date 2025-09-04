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
import {
  getVaults,
  getAllWordRelations,
  getSemanticConnections,
  deleteSemanticConnection,
} from "@/actions/actions";
import { Vault, Word, SemanticConnection } from "@/actions/actions";
import { Network, Link, Filter, RefreshCw, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MindMapView from "@/components/MindMapView";
import { CreateSemanticConnectionDialog } from "@/components/create-semantic-connection-dialog";

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

export default function ConnectionsPage() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [selectedVault, setSelectedVault] = useState<string>("all");
  const [connectedWords, setConnectedWords] = useState<ConnectedWord[]>([]);
  const [semanticConnections, setSemanticConnections] = useState<
    SemanticConnection[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "semantic" | "mindmap">(
    "semantic"
  );
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [selectedVault]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [vaultsData, relatedWordsData, semanticConnectionsData] =
        await Promise.all([
          getVaults(),
          getAllWordRelations(),
          getSemanticConnections(),
        ]);

      setVaults(vaultsData);

      // Processar palavras conectadas
      const connectedWordsMap = new Map<number, ConnectedWord>();

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
      setSemanticConnections(semanticConnectionsData);
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

  const handleDeleteSemanticConnection = async (connectionId: number) => {
    try {
      await deleteSemanticConnection(connectionId);
      toast({
        title: "Conexão deletada",
        description: "A conexão semântica foi removida",
      });
      loadData();
    } catch (error) {
      console.error("Erro ao deletar conexão semântica:", error);
      toast({
        title: "Erro",
        description: "Não foi possível deletar a conexão semântica",
        variant: "destructive",
      });
    }
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

  // Converter ConnectedWord[] para o formato esperado pelo MindMapView
  const convertToMindMapConnections = (connectedWords: ConnectedWord[]) => {
    const connections: any[] = [];

    // Criar conexões baseadas nas palavras relacionadas
    connectedWords.forEach((word, index) => {
      if (index < connectedWords.length - 1) {
        const nextWord = connectedWords[index + 1];
        connections.push({
          wordA: {
            id: word.id,
            name: word.name,
            grammaticalClass: word.grammaticalClass,
            translations: word.translations,
            vaultId: word.vaultId,
          },
          wordB: {
            id: nextWord.id,
            name: nextWord.name,
            grammaticalClass: nextWord.grammaticalClass,
            translations: nextWord.translations,
            vaultId: nextWord.vaultId,
          },
          vaultA: word.vaultName,
          vaultB: nextWord.vaultName,
        });
      }
    });

    return connections;
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
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
        </div>
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
                  variant={viewMode === "semantic" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("semantic")}
                  className="rounded-r-none"
                >
                  Semânticas
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none rounded-r-none"
                >
                  Lista
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
                {semanticConnections.length}
              </div>
              <div className="text-sm text-green-600">Conexões Semânticas</div>
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

      {/* Visualização de Conexões Semânticas */}
      {viewMode === "semantic" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5 text-blue-600" />
                Conexões Semânticas
              </CardTitle>
              <CreateSemanticConnectionDialog
                vaults={vaults}
                onConnectionCreated={handleRefresh}
              />
            </div>
          </CardHeader>
          <CardContent>
            {semanticConnections.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Network className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">
                  Nenhuma conexão semântica encontrada
                </p>
                <p className="text-sm mb-4">
                  Crie conexões semânticas entre suas palavras para explicar
                  suas relações
                </p>
                {/* <CreateSemanticConnectionDialog
                  vaults={vaults}
                  onConnectionCreated={handleRefresh}
                /> */}
              </div>
            ) : (
              <div className="space-y-4">
                {semanticConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-purple-50 hover:shadow-md transition-shadow"
                  >
                    <div className="mb-4">
                      <div className="flex items-center justify-center mb-3">
                        <div className="flex items-center justify-center w-full">
                          {connection.words.map((wordItem, index) => (
                            <div
                              key={wordItem.id}
                              className="flex items-center"
                            >
                              <div className="text-center">
                                <Badge
                                  variant="outline"
                                  className="text-lg px-4 py-2"
                                >
                                  {wordItem.word.name}
                                </Badge>
                                <div className="text-sm text-gray-600 mt-1">
                                  {wordItem.word.grammaticalClass}
                                </div>
                              </div>
                              {index < connection.words.length - 1 && (
                                <div className="flex flex-col items-center mx-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Link className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <Badge
                                    variant="secondary"
                                    className="mt-2 text-xs"
                                  >
                                    {connection.connectionType === "semantic" &&
                                      "Semântica"}
                                    {connection.connectionType ===
                                      "grammatical" && "Gramatical"}
                                    {connection.connectionType ===
                                      "contextual" && "Contextual"}
                                    {connection.connectionType === "opposite" &&
                                      "Opostos"}
                                    {connection.connectionType === "similar" &&
                                      "Similares"}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Exibir títulos e descrições das palavras */}
                      <div className="space-y-2">
                        {connection.words.map((wordItem) => (
                          <div
                            key={wordItem.id}
                            className="bg-white p-3 rounded-lg border"
                          >
                            <div className="font-medium text-gray-900 mb-1">
                              {wordItem.word.name}
                              {wordItem.title && (
                                <span className="text-blue-600 ml-2 text-sm">
                                  - {wordItem.title}
                                </span>
                              )}
                            </div>
                            {wordItem.description && (
                              <div className="text-sm text-gray-600">
                                {wordItem.description}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              {wordItem.word.grammaticalClass} •{" "}
                              {wordItem.word.translations[0] || "Sem tradução"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleDeleteSemanticConnection(connection.id)
                        }
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="bg-white rounded-lg p-4 border">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {connection.title}
                      </div>
                      <p className="text-gray-800 leading-relaxed">
                        {connection.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                      <div>
                        Criado em{" "}
                        {new Date(connection.createdAt).toLocaleDateString(
                          "pt-BR"
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Visualização de Mapa Mental */}
      {viewMode === "mindmap" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-green-600" />
              Mapa Mental das Conexões
            </CardTitle>
          </CardHeader>
          <CardContent>
            {connectedWords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Filter className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">
                  Nenhuma conexão para mapear
                </p>
                <p className="text-sm">
                  Conecte palavras para visualizar o mapa mental
                </p>
              </div>
            ) : (
              <div className="relative min-h-[600px] overflow-auto">
                <MindMapView
                  connections={convertToMindMapConnections(connectedWords)}
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
