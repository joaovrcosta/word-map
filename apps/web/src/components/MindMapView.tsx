"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import ReactFlow, {
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  NodeTypes,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Word } from "@/actions/actions";
import { Link2, Search, RotateCcw } from "lucide-react";

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

const MindMapNode = ({
  data,
}: {
  data: { word: string; active?: boolean };
}) => {
  const active = Boolean(data.active);

  return (
    <div className="flex w-max flex-col items-center">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
        style={{ top: 7 }}
      />
      <span
        className="size-3.5 rounded-full"
        style={{
          background: active ? "#a78bfa" : "#b7b7b7",
          boxShadow: active ? "0 0 0 6px rgba(167,139,250,0.22)" : "none",
        }}
      />
      <span
        className="mt-2 max-w-[140px] truncate text-center text-[13px] font-medium leading-none"
        style={{ color: active ? "#d6ccff" : "#d4d4d4" }}
      >
        {data.word}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
        style={{ top: 7 }}
      />
    </div>
  );
};

const nodeTypes: NodeTypes = {
  mindMapNode: MindMapNode,
};

function FitGraph({ count }: { count: number }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const id = window.setTimeout(() => {
      fitView({ padding: 0.45, maxZoom: 1.15, duration: 200 });
    }, 40);
    return () => window.clearTimeout(id);
  }, [count, fitView]);

  return null;
}

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

      const placed = Array.from(nodesMap.values());
      const radius = placed.length <= 1 ? 0 : 120;
      placed.forEach((node, index) => {
        const angle = (index / placed.length) * 2 * Math.PI - Math.PI / 2;
        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
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
        active: node.word === (centerWord || mindMapData.nodes[0]?.word),
      },
    }));
  }, [mindMapData.nodes, centerWord]);

  const reactFlowEdges = useMemo(() => {
    return mindMapData.connections.map((conn, index) => ({
      id: `edge-${index}`,
      source: conn.from,
      target: conn.to,
      type: "straight",
      style: {
        stroke: "#8d8d8d",
        strokeWidth: 1,
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
    <div className="mind-graph relative h-[calc(100dvh-15rem)] min-h-[420px] w-full overflow-hidden bg-[#161616]">
      {isCalculating && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#161616]/80">
          <p className="text-sm text-[#a3a3a3]">Calculando mapa mental...</p>
        </div>
      )}

      <div className="absolute left-4 top-4 z-10 w-[min(100%-2rem,320px)]">
        <div className="rounded-xl border border-white/10 bg-[#161616]/80 p-2 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8a8a]" />
              <Input
                type="text"
                placeholder="Pesquisar palavra"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 border-white/10 bg-transparent pl-9 text-white placeholder:text-[#8a8a8a]"
              />
            </div>
            {searchedWord && (
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="border-white/15 bg-transparent text-white hover:bg-white/10"
              >
                <RotateCcw className="size-4" />
                Resetar
              </Button>
            )}
          </div>

          {searchQuery && !searchedWord && (
            <div className="mt-2 max-h-32 overflow-y-auto">
              <div className="grid grid-cols-2 gap-1">
                {filteredAvailableWords.slice(0, 12).map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => handleSearch(word)}
                    className="truncate rounded-md px-2 py-1 text-left text-xs text-[#d4d4d4] hover:bg-white/10"
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => handleNodeClick(String(node.id))}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.45, maxZoom: 1.15 }}
        minZoom={0.2}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        className="bg-[#161616]"
      >
        <FitGraph count={nodes.length} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
