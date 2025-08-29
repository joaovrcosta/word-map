"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Word } from "@/actions/actions";
import { BookOpen, Link2, Search, RotateCcw } from "lucide-react";

interface WordConnection {
  wordA: Word;
  wordB: Word;
  vaultA: string;
  vaultB: string;
}

interface MindMapViewProps {
  connections: WordConnection[];
  selectedVault: string;
}

interface MindMapNode {
  id: string;
  word: Word;
  vaultName: string;
  x: number;
  y: number;
  level: number;
  connections: string[];
}

interface MindMapConnection {
  from: string;
  to: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export default function MindMapView({
  connections,
  selectedVault,
}: MindMapViewProps) {
  const [centerWord, setCenterWord] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedWord, setSearchedWord] = useState<string | null>(null);
  const [availableWords, setAvailableWords] = useState<string[]>([]);

  // Organizar as palavras em um mapa mental hierárquico
  const mindMapData = useMemo(() => {
    setIsCalculating(true);

    try {
      if (connections.length === 0) return { nodes: [], connections: [] };

      const nodesMap = new Map<string, MindMapNode>();
      const connectionsList: MindMapConnection[] = [];

      // Filtrar por vault se necessário
      let filteredConnections = connections;
      if (selectedVault !== "all") {
        const vaultId = parseInt(selectedVault);
        filteredConnections = connections.filter(
          (conn) =>
            conn.wordA.vaultId === vaultId || conn.wordB.vaultId === vaultId
        );
      }

      // Se há uma palavra pesquisada, filtrar apenas suas conexões
      if (searchedWord) {
        filteredConnections = filteredConnections.filter(
          (conn) =>
            conn.wordA.name === searchedWord || conn.wordB.name === searchedWord
        );
      }

      // Atualizar lista de palavras disponíveis para pesquisa
      const allWords = new Set<string>();
      connections.forEach((conn) => {
        allWords.add(conn.wordA.name);
        allWords.add(conn.wordB.name);
      });
      setAvailableWords(Array.from(allWords).sort());

      // Encontrar a palavra central
      let centralWord: string;

      if (searchedWord) {
        // Se há uma palavra pesquisada, ela é o centro
        centralWord = searchedWord;
        setCenterWord(searchedWord);
      } else {
        // Caso contrário, usar a palavra com mais conexões
        const wordConnections = new Map<string, number>();
        filteredConnections.forEach((conn) => {
          wordConnections.set(
            conn.wordA.name,
            (wordConnections.get(conn.wordA.name) || 0) + 1
          );
          wordConnections.set(
            conn.wordB.name,
            (wordConnections.get(conn.wordB.name) || 0) + 1
          );
        });

        centralWord = Array.from(wordConnections.entries()).sort(
          ([, a], [, b]) => b - a
        )[0]?.[0];

        if (!centralWord) return { nodes: [], connections: [] };

        // Definir a palavra central se não estiver definida
        if (!centerWord) {
          setCenterWord(centralWord);
        }
      }

      const currentCenter = centerWord || centralWord;

      // Criar nós organizados em níveis
      const levels = new Map<number, string[]>();
      levels.set(0, [currentCenter]);

      // Adicionar palavras conectadas ao centro
      const level1Words = new Set<string>();
      filteredConnections.forEach((conn) => {
        if (conn.wordA.name === currentCenter) {
          level1Words.add(conn.wordB.name);
        } else if (conn.wordB.name === currentCenter) {
          level1Words.add(conn.wordA.name);
        }
      });
      levels.set(1, Array.from(level1Words));

      // Adicionar palavras do nível 2
      const level2Words = new Set<string>();
      level1Words.forEach((word) => {
        filteredConnections.forEach((conn) => {
          if (conn.wordA.name === word && conn.wordB.name !== currentCenter) {
            level2Words.add(conn.wordB.name);
          } else if (
            conn.wordB.name === word &&
            conn.wordA.name !== currentCenter
          ) {
            level2Words.add(conn.wordA.name);
          }
        });
      });
      levels.set(2, Array.from(level2Words));

      // Criar nós com posições
      let nodeId = 0;
      levels.forEach((words, level) => {
        const radius = level * 200 + 100;
        const angleStep = (2 * Math.PI) / Math.max(words.length, 1);

        words.forEach((wordName, index) => {
          const angle = index * angleStep;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          // Encontrar a palavra e vault correspondentes
          const connection = filteredConnections.find(
            (conn) =>
              conn.wordA.name === wordName || conn.wordB.name === wordName
          );

          if (connection) {
            const word =
              connection.wordA.name === wordName
                ? connection.wordA
                : connection.wordB;
            const vaultName =
              connection.wordA.name === wordName
                ? connection.vaultA
                : connection.vaultB;

            nodesMap.set(wordName, {
              id: wordName,
              word,
              vaultName,
              x: x + 400, // Centralizar no canvas
              y: y + 300,
              level,
              connections: [],
            });
          }
        });
      });

      // Criar conexões
      filteredConnections.forEach((conn) => {
        const nodeA = nodesMap.get(conn.wordA.name);
        const nodeB = nodesMap.get(conn.wordB.name);

        if (nodeA && nodeB) {
          connectionsList.push({
            from: conn.wordA.name,
            to: conn.wordB.name,
            fromX: nodeA.x,
            fromY: nodeA.y,
            toX: nodeB.x,
            toY: nodeB.y,
          });
        }
      });

      return {
        nodes: Array.from(nodesMap.values()),
        connections: connectionsList,
      };
    } finally {
      setIsCalculating(false);
    }
  }, [connections, selectedVault, centerWord, searchedWord]);

  const handleNodeClick = (wordName: string) => {
    setCenterWord(wordName);
  };

  const handleSearch = (wordName: string) => {
    setSearchedWord(wordName);
    setSearchQuery("");
  };

  const handleReset = () => {
    setSearchedWord(null);
    setCenterWord(null);
  };

  const filteredAvailableWords = useMemo(() => {
    if (!searchQuery) return availableWords;
    return availableWords.filter((word) =>
      word.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, availableWords]);

  const getNodeColor = (level: number) => {
    switch (level) {
      case 0:
        return "bg-blue-500 hover:bg-blue-600";
      case 1:
        return "bg-green-500 hover:bg-green-600";
      case 2:
        return "bg-purple-500 hover:bg-purple-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const getNodeSize = (level: number) => {
    switch (level) {
      case 0:
        return "w-20 h-20";
      case 1:
        return "w-16 h-16";
      case 2:
        return "w-14 h-14";
      default:
        return "w-12 h-12";
    }
  };

  if (mindMapData.nodes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <Link2 className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-lg font-medium mb-2">Nenhuma conexão encontrada</p>
        <p className="text-sm text-gray-400">
          {selectedVault === "all"
            ? "Conecte palavras nos seus vaults para visualizar o mapa mental"
            : "Este vault não possui palavras conectadas. Tente selecionar 'Todos os Vaults' ou conectar palavras primeiro."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Indicador de carregamento */}
      {isCalculating && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Calculando mapa mental...</p>
          </div>
        </div>
      )}

      {/* Canvas do Mapa Mental */}
      <div className="relative w-full h-[600px] bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg overflow-hidden">
        {/* Interface de Pesquisa */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="bg-white border rounded-lg p-3 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {searchedWord
                    ? `Visualizando conexões de: ${searchedWord}`
                    : "Pesquisar palavra"}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Digite o nome da palavra..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4"
                  />
                </div>
              </div>
              {searchedWord && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Resetar
                </Button>
              )}
            </div>

            {/* Lista de palavras disponíveis */}
            {searchQuery && !searchedWord && (
              <div className="max-h-32 overflow-y-auto">
                <div className="text-xs text-gray-500 mb-2">
                  Palavras disponíveis ({filteredAvailableWords.length}):
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {filteredAvailableWords.slice(0, 15).map((word) => (
                    <button
                      key={word}
                      onClick={() => handleSearch(word)}
                      className="text-left px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                    >
                      {word}
                    </button>
                  ))}
                </div>
                {filteredAvailableWords.length > 15 && (
                  <div className="text-xs text-gray-400 mt-1">
                    ... e mais {filteredAvailableWords.length - 15} palavras
                  </div>
                )}
              </div>
            )}

            {/* Palavra atualmente visualizada */}
            {searchedWord && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Palavra central:</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  {searchedWord}
                </Badge>
                <span className="text-gray-500">
                  ({mindMapData.nodes.length - 1} conexões encontradas)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Conexões */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {mindMapData.connections.map((conn, index) => (
            <line
              key={index}
              x1={conn.fromX}
              y1={conn.fromY}
              x2={conn.toX}
              y2={conn.toY}
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="5,5"
              opacity="0.6"
            />
          ))}
        </svg>

        {/* Nós */}
        {mindMapData.nodes.map((node) => (
          <div
            key={node.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 cursor-pointer group ${getNodeSize(
              node.level
            )}`}
            style={{ left: node.x, top: node.y }}
            onClick={() => handleNodeClick(node.id)}
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            {/* Nó principal */}
            <div
              className={`w-full h-full rounded-full ${getNodeColor(
                node.level
              )} shadow-lg flex items-center justify-center text-white font-bold text-sm transition-all duration-300 group-hover:scale-110`}
            >
              {node.word.name.length > 8
                ? node.word.name.substring(0, 6) + "..."
                : node.word.name}
            </div>

            {/* Tooltip */}
            {hoveredNode === node.id && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-white border rounded-lg shadow-lg z-10 min-w-[200px]">
                <div className="text-center">
                  <div className="font-bold text-gray-900 mb-1">
                    {node.word.name}
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    <BookOpen className="w-3 h-3 inline mr-1" />
                    {node.vaultName}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {node.word.grammaticalClass}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Nível {node.word.confidence}
                    </Badge>
                  </div>
                  {node.word.translations.length > 0 && (
                    <div className="text-xs text-gray-700">
                      <strong>Traduções:</strong>{" "}
                      {node.word.translations.slice(0, 2).join(", ")}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Indicador de nível */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
              {node.level + 1}
            </div>
          </div>
        ))}

        {/* Palavra central destacada */}
        {centerWord && !searchedWord && (
          <div className="absolute top-4 left-4 bg-white border rounded-lg p-3 shadow-lg">
            <div className="text-sm font-medium text-gray-700 mb-1">
              Centro do Mapa:
            </div>
            <div className="text-lg font-bold text-blue-600">{centerWord}</div>
            <button
              onClick={() => setCenterWord(null)}
              className="text-xs text-gray-500 hover:text-gray-700 mt-1"
            >
              Resetar centro
            </button>
          </div>
        )}

        {/* Legenda */}
        <div className="absolute bottom-4 right-4 bg-white border rounded-lg p-3 shadow-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">Legenda:</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span>Centro (Nível 1)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Conectadas (Nível 2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
              <span>Secundárias (Nível 3)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
