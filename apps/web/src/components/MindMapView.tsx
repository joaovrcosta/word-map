"use client";

import { useMemo, useState, useCallback } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Word } from "@/actions/actions";
import { BookOpen, Link2, Search, RotateCcw, Network } from "lucide-react";

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

// Nó personalizado para o mapa mental
const MindMapNode = ({ data }: { data: any }) => {
  const getNodeColors = (confidence: number) => {
    switch (confidence) {
      case 1: // Iniciante
        return { border: "#00ff00", text: "#006400", bg: "#f0fff0" };
      case 2: // Básico
        return { border: "#ffff00", text: "#9a8700", bg: "#fffff0" };
      case 3: // Intermediário
        return { border: "#ffa500", text: "#cc7000", bg: "#fff8f0" };
      case 4: // Avançado
        return { border: "#ff0000", text: "#8b0000", bg: "#fff0f0" };
      default:
        return { border: "#cccccc", text: "#666666", bg: "#f9f9f9" };
    }
  };

  const getNodeSize = (level: number) => {
    switch (level) {
      case 0:
        return { width: 120, height: 80 };
      case 1:
        return { width: 100, height: 70 };
      case 2:
        return { width: 90, height: 60 };
      default:
        return { width: 80, height: 50 };
    }
  };

  const colors = getNodeColors(data.confidence || 1);
  const size = getNodeSize(data.level);

  return (
    <div
      style={{
        width: size.width,
        height: size.height,
        border: `2px solid ${colors.border}`,
        borderRadius: "8px",
        backgroundColor: colors.bg,
        color: colors.text,
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        position: "relative",
      }}
    >
      {/* Handle superior para conexões de entrada */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: colors.border, width: "8px", height: "8px" }}
      />

      {/* Conteúdo do nó */}
      <div className="text-center">
        <div className="font-bold text-sm mb-1" style={{ color: colors.text }}>
          {data.word}
        </div>
        <div className="text-xs opacity-80" style={{ color: colors.text }}>
          {data.vaultName}
        </div>
        <div
          className="text-xs font-medium mt-1"
          style={{ color: colors.text }}
        >
          Nível {data.confidence || 1}
        </div>
      </div>

      {/* Handle inferior para conexões de saída */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: colors.border, width: "8px", height: "8px" }}
      />

      {/* Handle esquerdo para conexões laterais */}
      <Handle
        type="source"
        position={Position.Left}
        style={{ background: colors.border, width: "8px", height: "8px" }}
      />

      {/* Handle direito para conexões laterais */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: colors.border, width: "8px", height: "8px" }}
      />

      {/* Indicador de nível hierárquico */}
      <div
        className="absolute -top-2 -right-2 w-5 h-5 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-xs font-bold text-gray-600"
        style={{ borderColor: colors.border }}
      >
        {data.level + 1}
      </div>
    </div>
  );
};

const nodeTypes: NodeTypes = {
  mindMapNode: MindMapNode,
};

export default function MindMapView({
  connections,
  selectedVault,
}: MindMapViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedWord, setSearchedWord] = useState<string | null>(null);
  const [centerWord, setCenterWord] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Estados do React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Organizar as palavras em um mapa mental hierárquico
  const mindMapData = useMemo(() => {
    setIsCalculating(true);

    try {
      if (connections.length === 0) return { nodes: [], connections: [] };

      const nodesMap = new Map<string, any>();
      const connectionsList: any[] = [];

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

      // Encontrar a palavra central
      let centralWord: string;

      if (searchedWord) {
        // Se há uma palavra pesquisada, ela é o centro
        centralWord = searchedWord;
        setCenterWord(searchedWord);
      } else if (centerWord) {
        // Se há uma palavra central definida, usá-la
        centralWord = centerWord;
      } else {
        // Caso contrário, usar a primeira palavra da primeira conexão
        centralWord = filteredConnections[0].wordA.name;
        setCenterWord(centralWord);
      }

      // Criar nós hierárquicos
      const level0Words = new Set([centralWord]);
      const level1Words = new Set<string>();
      const level2Words = new Set<string>();

      // Nível 1: palavras diretamente conectadas ao centro
      filteredConnections.forEach((conn) => {
        if (conn.wordA.name === centralWord) {
          level1Words.add(conn.wordB.name);
        } else if (conn.wordB.name === centralWord) {
          level1Words.add(conn.wordA.name);
        }
      });

      // Nível 2: palavras conectadas às do nível 1
      filteredConnections.forEach((conn) => {
        if (
          level1Words.has(conn.wordA.name) &&
          conn.wordB.name !== centralWord
        ) {
          level2Words.add(conn.wordB.name);
        } else if (
          level1Words.has(conn.wordB.name) &&
          conn.wordA.name !== centralWord
        ) {
          level2Words.add(conn.wordA.name);
        }
      });

      // Posicionar nós
      const centerX = 400;
      const centerY = 300;
      const level1Radius = 200;
      const level2Radius = 350;

      // Nó central (nível 0)
      nodesMap.set(centralWord, {
        id: centralWord,
        word: centralWord,
        vaultName:
          filteredConnections.find(
            (conn) =>
              conn.wordA.name === centralWord || conn.wordB.name === centralWord
          )?.vaultA || "Vault",
        x: centerX,
        y: centerY,
        level: 0,
        confidence: 4, // Nível de confiança para o centro
      });

      // Nós do nível 1
      const level1Array = Array.from(level1Words);
      level1Array.forEach((word, index) => {
        const angle = (index / level1Array.length) * 2 * Math.PI;
        const x = centerX + level1Radius * Math.cos(angle);
        const y = centerY + level1Radius * Math.sin(angle);

        nodesMap.set(word, {
          id: word,
          word: word,
          vaultName:
            filteredConnections.find(
              (conn) => conn.wordA.name === word || conn.wordB.name === word
            )?.vaultA || "Vault",
          x: x,
          y: y,
          level: 1,
          confidence: 3, // Nível de confiança para nível 1
        });
      });

      // Nós do nível 2
      const level2Array = Array.from(level2Words);
      level2Array.forEach((word, index) => {
        const angle = (index / level2Array.length) * 2 * Math.PI;
        const x = centerX + level2Radius * Math.cos(angle);
        const y = centerY + level2Radius * Math.sin(angle);

        nodesMap.set(word, {
          id: word,
          word: word,
          vaultName:
            filteredConnections.find(
              (conn) => conn.wordA.name === word || conn.wordB.name === word
            )?.vaultA || "Vault",
          x: x,
          y: y,
          level: 2,
          confidence: 2, // Nível de confiança para nível 2
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

  // Converter dados para formato do React Flow
  const reactFlowNodes = useMemo(() => {
    return mindMapData.nodes.map((node) => ({
      id: node.id,
      type: "mindMapNode",
      position: { x: node.x, y: node.y },
      data: {
        word: node.word,
        vaultName: node.vaultName,
        level: node.level,
        confidence: node.confidence,
      },
    }));
  }, [mindMapData.nodes]);

  const reactFlowEdges = useMemo(() => {
    return mindMapData.connections.map((conn, index) => ({
      id: `edge-${index}`,
      source: conn.from,
      target: conn.to,
      type: "smoothstep",
      style: {
        stroke: "#94a3b8",
        strokeWidth: 2,
        strokeDasharray: "5,5",
        opacity: 0.6,
      },
    }));
  }, [mindMapData.connections]);

  // Atualizar nós e arestas quando os dados mudarem
  useMemo(() => {
    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
  }, [reactFlowNodes, reactFlowEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback((wordName: string) => {
    setCenterWord(wordName);
  }, []);

  const handleSearch = useCallback((wordName: string) => {
    setSearchedWord(wordName);
    setSearchQuery("");
  }, []);

  const handleReset = useCallback(() => {
    setSearchQuery("");
    setSearchedWord(null);
    setCenterWord(null);
  }, []);

  const filteredAvailableWords = useMemo(() => {
    const allWords = new Set<string>();
    connections.forEach((conn) => {
      allWords.add(conn.wordA.name);
      allWords.add(conn.wordB.name);
    });
    const availableWords = Array.from(allWords).sort();

    if (!searchQuery) return availableWords;
    return availableWords.filter((word) =>
      word.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, connections]);

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

      {/* Mapa Mental com React Flow */}
      <div className="w-full h-[600px] bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e2e8f0" gap={16} />
          <Controls />
        </ReactFlow>
      </div>

      {/* Legenda */}
      <div className="absolute bottom-4 right-4 bg-white border rounded-lg p-3 shadow-lg">
        <div className="text-sm font-medium text-gray-700 mb-2">Legenda:</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 border-2 rounded"
              style={{ borderColor: "#00ff00", backgroundColor: "#f0fff0" }}
            ></div>
            <span>Iniciante (Nível 1)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 border-2 rounded"
              style={{ borderColor: "#ffff00", backgroundColor: "#fffff0" }}
            ></div>
            <span>Básico (Nível 2)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 border-2 rounded"
              style={{ borderColor: "#ffa500", backgroundColor: "#fff8f0" }}
            ></div>
            <span>Intermediário (Nível 3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 border-2 rounded"
              style={{ borderColor: "#ff0000", backgroundColor: "#fff0f0" }}
            ></div>
            <span>Avançado (Nível 4)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
