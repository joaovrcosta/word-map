"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { Plus, BookOpen, Target, Trophy, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/words-table/data-table";
import { columns } from "@/components/tables/words-table/columns";
import { type Vault, type Word } from "@/actions/actions";
import { getCurrentUser } from "@/actions/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createWord } from "@/actions/actions";
import { SearchWord } from "@/components/search-word";
import { ImportExportWords } from "@/components/import-export-words";
import { SentenceBuilder } from "@/components/sentence-builder";
import { translateToPortuguese } from "@/lib/translate";
import { useSearchParams, useRouter } from "next/navigation";
import { useWords, useVaults } from "@/hooks/use-words";
import { useQueryClient } from "@tanstack/react-query";

function HomePageContent() {
  const [activeTab, setActiveTab] = useState<"words" | "sentences">("words");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWord, setNewWord] = useState({
    name: "",
    grammaticalClass: "",
    category: "",
    translations: "",
    confidence: 1,
  });
  const [isCreatingWord, setIsCreatingWord] = useState(false);
  const [isTableUpdating, setIsTableUpdating] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Usar hooks otimizados com cache
  const { vaults, currentVault, words, isLoading } = useWords();

  // Obter vaultId da URL de forma otimizada
  const vaultIdFromUrl = useMemo(() => {
    return searchParams.get("vaultId");
  }, [searchParams]);

  // Selecionar vault baseado na URL ou primeiro disponível
  const selectedVault = useMemo(() => {
    if (!vaults) return null;

    if (vaultIdFromUrl) {
      const vault = vaults.find((v) => v.id === parseInt(vaultIdFromUrl));
      if (vault) return vault;
    }

    return vaults[0] || null;
  }, [vaults, vaultIdFromUrl]);

  // Atualizar palavras quando o vault selecionado mudar
  const currentWords = useMemo(() => {
    return selectedVault?.words || [];
  }, [selectedVault]);

  // Handler para mudança de vault otimizado
  const handleVaultChange = useCallback(
    (vaultId: string) => {
      // Navegar para a URL com o novo vaultId selecionado
      router.push(`/home?vaultId=${vaultId}`);
    },
    [router]
  );

  // Handler para criar palavra otimizado
  const handleCreateWord = useCallback(async () => {
    if (!selectedVault || !newWord.name.trim() || !newWord.grammaticalClass) {
      return;
    }

    setIsCreatingWord(true);
    setIsTableUpdating(true);
    try {
      // Extrair traduções do input
      const rawTranslations = newWord.translations
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

      // Traduzir traduções para português se estiverem em inglês
      let translations = rawTranslations;
      if (rawTranslations.length > 0) {
        try {
          translations = await Promise.all(
            rawTranslations.map(async (translation) => {
              // Verificar se parece ser inglês (contém apenas caracteres ASCII)
              const isEnglish = /^[a-zA-Z\s\-']+$/.test(translation);
              if (isEnglish) {
                return await translateToPortuguese(translation);
              }
              return translation; // Manter se não for inglês
            })
          );
        } catch (error) {
          console.warn("Erro ao traduzir traduções, usando originais:", error);
          translations = rawTranslations;
        }
      }

      const wordData = {
        name: newWord.name.trim(),
        grammaticalClass: newWord.grammaticalClass,
        category: newWord.category.trim() || undefined,
        translations: translations,
        confidence: newWord.confidence,
        vaultId: selectedVault.id,
      };

      await createWord(wordData);

      // Resetar formulário
      setNewWord({
        name: "",
        grammaticalClass: "",
        category: "",
        translations: "",
        confidence: 1,
      });

      // Fechar dialog
      setIsCreateDialogOpen(false);

      // Invalidar cache para atualizar a tabela
      queryClient.invalidateQueries({ queryKey: ["vaults"] });

      // Mostrar toast de sucesso
      // toast({
      //   title: "Palavra criada!",
      //   description: `"${wordData.name}" foi adicionada ao vault "${selectedVault.name}"`,
      // });
    } catch (error) {
      console.error("Erro ao criar palavra:", error);
      // toast({
      //   title: "Erro ao criar palavra",
      //   description: error instanceof Error ? error.message : "Erro desconhecido",
      //   variant: "destructive",
      // });
    } finally {
      setIsCreatingWord(false);
      setIsTableUpdating(false);
    }
  }, [selectedVault, newWord, queryClient]);

  // Handler para fechar dialog
  const handleDialogClose = useCallback(() => {
    setIsCreateDialogOpen(false);
    setNewWord({
      name: "",
      grammaticalClass: "",
      category: "",
      translations: "",
      confidence: 1,
    });
  }, []);

  // Estatísticas calculadas
  const stats = useMemo(
    () => [
      {
        title: "Total de Palavras",
        value: currentWords.length,
        icon: BookOpen,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
      },
      {
        title: "Palavras Salvas",
        value: currentWords.filter((word) => word.isSaved).length,
        icon: Target,
        color: "text-green-600",
        bgColor: "bg-green-100",
      },
      {
        title: "Grau de Confiança",
        value:
          currentWords.length > 0
            ? Math.round(
                currentWords.reduce((acc, word) => acc + word.confidence, 0) /
                  currentWords.length
              )
            : 0,
        suffix: "/4",
        icon: Trophy,
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
      },
    ],
    [currentWords]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando vaults...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 pt-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {selectedVault?.name || "Dashboard"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie suas palavras e acompanhe seu progresso
          </p>
        </div>

        {/* Seleção de Vault */}
        <div className="flex items-center gap-4">
          {vaults && vaults.length > 0 && (
            <Select
              value={selectedVault?.id.toString() || ""}
              onValueChange={handleVaultChange}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selecione um vault" />
              </SelectTrigger>
              <SelectContent>
                {vaults.map((vault) => (
                  <SelectItem key={vault.id} value={vault.id.toString()}>
                    {vault.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Botão de Criar Palavra */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus size={20} className="mr-2" />
                Nova Palavra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Nova Palavra</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Palavra
                  </label>
                  <Input
                    placeholder="Digite a palavra"
                    value={newWord.name}
                    onChange={(e) =>
                      setNewWord((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Classe Gramatical
                  </label>
                  <Select
                    value={newWord.grammaticalClass}
                    onValueChange={(value) =>
                      setNewWord((prev) => ({
                        ...prev,
                        grammaticalClass: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a classe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="substantivo">Substantivo</SelectItem>
                      <SelectItem value="verbo">Verbo</SelectItem>
                      <SelectItem value="adjetivo">Adjetivo</SelectItem>
                      <SelectItem value="adverbio">Advérbio</SelectItem>
                      <SelectItem value="pronome">Pronome</SelectItem>
                      <SelectItem value="preposicao">Preposição</SelectItem>
                      <SelectItem value="conjuncao">Conjunção</SelectItem>
                      <SelectItem value="interjeicao">Interjeição</SelectItem>
                      <SelectItem value="phrasal-verb">Phrasal Verb</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoria (opcional)
                  </label>
                  <Input
                    placeholder="Ex: cores, animais, profissões..."
                    value={newWord.category}
                    onChange={(e) =>
                      setNewWord((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Traduções
                  </label>
                  <Input
                    placeholder="Digite as traduções separadas por vírgula"
                    value={newWord.translations}
                    onChange={(e) =>
                      setNewWord((prev) => ({
                        ...prev,
                        translations: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Grau de Confiança
                  </label>
                  <Select
                    value={newWord.confidence.toString()}
                    onValueChange={(value) =>
                      setNewWord((prev) => ({
                        ...prev,
                        confidence: parseInt(value),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Iniciante</SelectItem>
                      <SelectItem value="2">2 - Básico</SelectItem>
                      <SelectItem value="3">3 - Intermediário</SelectItem>
                      <SelectItem value="4">4 - Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleDialogClose}
                    disabled={isCreatingWord}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateWord}
                    disabled={
                      isCreatingWord ||
                      !newWord.name.trim() ||
                      !newWord.grammaticalClass
                    }
                    size="lg"
                  >
                    {isCreatingWord ? "Criando..." : "Criar Palavra"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Botão de Importar/Exportar */}
          {selectedVault && (
            <ImportExportWords
              vaultId={selectedVault.id}
              vaultName={selectedVault.name}
              wordCount={currentWords.length}
            />
          )}
        </div>
      </div>

      {/* Abas de Navegação */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("words")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "words"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            <BookOpen size={16} className="inline mr-2" />
            Palavras
          </button>
          <button
            onClick={() => setActiveTab("sentences")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "sentences"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            <FileText size={16} className="inline mr-2" />
            Construtor de Frases
          </button>
        </nav>
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === "words" ? (
        <>
          <SearchWord />

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((stat) => (
              <div
                key={stat.title}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-[2px] text-[#4b4b4b] border-[#e5e5e5]"
              >
                <div className="flex items-center">
                  <div className={`p-2 rounded-2xl ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {stat.value}
                      {stat.suffix || ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabela de Palavras */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Palavras do Vault
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {currentWords.length} palavra
                {currentWords.length !== 1 ? "s" : ""} encontrada
                {currentWords.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="p-6">
              {currentWords.length > 0 ? (
                <DataTable<Word>
                  columns={columns}
                  data={currentWords}
                  isLoading={isTableUpdating}
                />
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                    Nenhuma palavra encontrada
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Comece adicionando sua primeira palavra ao vault.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus size={20} className="mr-2" />
                    Adicionar Primeira Palavra
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <SentenceBuilder />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando...</p>
          </div>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
