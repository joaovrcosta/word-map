"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { Plus, BookOpen, Sparkles, Target, Trophy } from "lucide-react";
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
import { VaultOnboarding } from "@/components/vault-onboarding";
import { translateToPortuguese } from "@/lib/translate";
import { useSearchParams, useRouter } from "next/navigation";
import { useWords, useVaults } from "@/hooks/use-words";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { lookupWordInfo } from "@/lib/dictionary-client";
import { normalizeGrammaticalClass } from "@/lib/dictionary";

const GRAMMATICAL_CLASS_LABELS: Record<string, string> = {
  substantivo: "Substantivo",
  verbo: "Verbo",
  adjetivo: "Adjetivo",
  adverbio: "Advérbio",
  pronome: "Pronome",
  preposicao: "Preposição",
  conjuncao: "Conjunção",
  interjeicao: "Interjeição",
  "phrasal-verb": "Phrasal Verb",
  frase: "Frase",
};

function HomePageContent() {
  const [activeTab, setActiveTab] = useState<"words" | "report" | "settings">(
    "words"
  );
  const [firstName, setFirstName] = useState("");
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
  const [classChosenByUser, setClassChosenByUser] = useState(false);
  const [isSuggestingClass, setIsSuggestingClass] = useState(false);
  const [suggestedClass, setSuggestedClass] = useState("");
  const debouncedWordName = useDebounce(newWord.name, 400);
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.name) {
        setFirstName(user.name.split(" ")[0]);
      }
    });
  }, []);

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

  useEffect(() => {
    if (!isCreateDialogOpen) return;

    const name = debouncedWordName.trim();
    if (name.length < 2) {
      setSuggestedClass("");
      setIsSuggestingClass(false);
      return;
    }

    const tokens = name.split(/\s+/).filter(Boolean);
    if (tokens.length >= 3) {
      const suggested = "frase";
      setSuggestedClass(suggested);
      setIsSuggestingClass(false);
      if (!classChosenByUser) {
        setNewWord((prev) => ({ ...prev, grammaticalClass: suggested }));
      }
      return;
    }

    let cancelled = false;
    setIsSuggestingClass(true);

    lookupWordInfo(name)
      .then((entry) => {
        if (cancelled) return;
        const suggested = normalizeGrammaticalClass(
          entry?.meanings?.[0]?.partOfSpeech
        );
        setSuggestedClass(suggested);
        if (!classChosenByUser) {
          setNewWord((prev) => ({ ...prev, grammaticalClass: suggested }));
        }
      })
      .finally(() => {
        if (!cancelled) setIsSuggestingClass(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedWordName, isCreateDialogOpen, classChosenByUser]);

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
      setClassChosenByUser(false);
      setSuggestedClass("");

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
    setClassChosenByUser(false);
    setSuggestedClass("");
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

  // Estado vazio quando não há vaults
  if (!vaults || vaults.length === 0) {
    return (
      <div className="space-y-6 px-6 pt-6 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Bem-vindo ao Word Map
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Comece criando seu primeiro vault para organizar suas palavras
            </p>
          </div>
        </div>

        {/* Estado vazio com instruções */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
          <div className="p-12 text-center">
            <BookOpen className="mx-auto h-16 w-16 text-gray-400 mb-6" />
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Crie seu primeiro Vault
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Os vaults são como pastas onde você pode organizar suas palavras por tema, 
              nível de dificuldade ou qualquer critério que preferir. Comece criando seu 
              primeiro vault para começar a construir seu vocabulário!
            </p>
            
            {/* Instruções */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8 max-w-3xl mx-auto">
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4">
                Como funciona:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Crie um Vault</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      Dê um nome ao seu vault (ex: "Vocabulário Básico")
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Adicione Palavras</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      Use a busca ou adicione manualmente suas palavras
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Organize e Estude</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      Use flashcards e construa frases para praticar
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button size="lg" className="px-8 py-3" asChild>
              <Link href="/create-vault">
                <Plus size={20} className="mr-2" />
                Criar meu próprio vault
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const tabClass = (tab: typeof activeTab) =>
    cn(
      "py-3 text-[13px] font-extrabold uppercase tracking-wide border-b-4 transition-colors",
      activeTab === tab
        ? "border-[#1cb0f6] text-[#1cb0f6]"
        : "border-transparent text-[#afafaf] hover:text-[#777]"
    );

  return (
    <div className="min-h-full bg-white dark:bg-gray-950 max-w-full overflow-x-hidden">
      <div className="px-8 pt-5">
        <div className="flex items-center gap-3">
          <span className="text-[26px] leading-none" aria-hidden="true">
            📗
          </span>
          <h1 className="text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
            {selectedVault?.name || "Vault"}
          </h1>
        </div>
        <nav className="mt-4 flex gap-8 border-b border-[#e5e5e5] dark:border-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab("words")}
            className={tabClass("words")}
          >
            Palavras
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={tabClass("report")}
          >
            Relatório
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={tabClass("settings")}
          >
            Configurações
          </button>
        </nav>
      </div>

      <div className="px-6">
        {activeTab === "words" &&
          (currentWords.length === 0 ? (
            <VaultOnboarding
              firstName={firstName}
              onAddWords={() => setIsCreateDialogOpen(true)}
              onCreateFlashcards={() =>
                router.push(`/home/vault/${selectedVault?.id}/flashcards`)
              }
            />
          ) : (
            <div className="space-y-6 py-6">
              <div className="flex justify-end">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus size={20} className="mr-2" />
                  Nova Palavra
                </Button>
              </div>
              <SearchWord />
              <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white overflow-hidden">
                <div className="px-6 py-5 border-b-2 border-[#e5e5e5]">
                  <h2 className="text-lg font-extrabold text-[#3c3c3c] dark:text-white">
                    Palavras do Vault
                  </h2>
                  <p className="mt-1 text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf]">
                    {currentWords.length} palavra
                    {currentWords.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="p-5">
                  <DataTable<Word>
                    columns={columns}
                    data={currentWords}
                    isLoading={isTableUpdating}
                  />
                </div>
              </div>
            </div>
          ))}

        {activeTab === "report" && (
          <div className="space-y-6 py-8 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {stats.map((stat) => (
                <div
                  key={stat.title}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 text-[#4b4b4b] border-[#e5e5e5]"
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
            <SentenceBuilder />
          </div>
        )}

        {activeTab === "settings" && selectedVault && (
          <div className="max-w-xl mx-auto py-10 space-y-6">
            {vaults && vaults.length > 1 && (
              <div>
                <p className="text-sm font-bold text-[#3c3c3c] dark:text-gray-200 mb-2">
                  Vault atual
                </p>
                <Select
                  value={selectedVault.id.toString()}
                  onValueChange={handleVaultChange}
                >
                  <SelectTrigger className="w-full">
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
              </div>
            )}
            <ImportExportWords
              vaultId={selectedVault.id}
              vaultName={selectedVault.name}
              wordCount={currentWords.length}
            />
          </div>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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
                    onChange={(e) => {
                      setClassChosenByUser(false);
                      setNewWord((prev) => ({
                        ...prev,
                        name: e.target.value,
                        grammaticalClass: "",
                      }));
                    }}
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Classe Gramatical
                    </label>
                    {(isSuggestingClass ||
                      (suggestedClass &&
                        newWord.grammaticalClass === suggestedClass &&
                        !classChosenByUser)) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                        <Sparkles className="size-3" />
                        IA
                      </span>
                    )}
                  </div>
                  <Select
                    value={newWord.grammaticalClass || undefined}
                    onValueChange={(value) => {
                      setClassChosenByUser(true);
                      setNewWord((prev) => ({
                        ...prev,
                        grammaticalClass: value,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isSuggestingClass
                            ? "Sugerindo classe..."
                            : "Selecione a classe"
                        }
                      />
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
                      <SelectItem value="frase">Frase</SelectItem>
                    </SelectContent>
                  </Select>
                  {isSuggestingClass && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-violet-500">
                      <Sparkles className="size-3" />
                      Buscando sugestão de IA...
                    </p>
                  )}
                  {!isSuggestingClass &&
                    suggestedClass &&
                    newWord.grammaticalClass === suggestedClass &&
                    !classChosenByUser && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-300">
                        <Sparkles className="size-3 shrink-0" />
                        Sugestão de IA:{" "}
                        {GRAMMATICAL_CLASS_LABELS[suggestedClass]}
                      </p>
                    )}
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
