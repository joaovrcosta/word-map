"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ImportExportWords } from "@/components/import-export-words";
import { DeleteVaultSettings } from "@/components/delete-vault-dialog";
import { VaultWordsList } from "@/components/vault-words-list";
import { VaultReport } from "@/components/vault-report";
import { VaultOnboarding } from "@/components/vault-onboarding";
import { translateToPortuguese } from "@/lib/translate";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useWords } from "@/hooks/use-words";
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

export function VaultScreen() {
  const [hasMounted, setHasMounted] = useState(false);
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
  const [classChosenByUser, setClassChosenByUser] = useState(false);
  const [isSuggestingClass, setIsSuggestingClass] = useState(false);
  const [suggestedClass, setSuggestedClass] = useState("");
  const debouncedWordName = useDebounce(newWord.name, 400);
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const vaultId = Number(params.id);
  const activeTab = pathname.endsWith("/relatorio")
    ? "report"
    : pathname.endsWith("/configuracoes")
      ? "settings"
      : "words";
  const queryClient = useQueryClient();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user?.name) {
        setFirstName(user.name.split(" ")[0]);
      }
    });
  }, []);

  // Usar hooks otimizados com cache
  const { vaults, isLoading } = useWords();

  const selectedVault = useMemo(() => {
    if (!vaults || !Number.isInteger(vaultId)) return null;
    return vaults.find((vault) => vault.id === vaultId) ?? null;
  }, [vaults, vaultId]);

  // Atualizar palavras quando o vault selecionado mudar
  const currentWords = useMemo(() => {
    return selectedVault?.words || [];
  }, [selectedVault]);

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

  // O cache de vaults pode já existir no cliente (a sidebar busca antes),
  // enquanto o servidor ainda renderiza sem dados. O primeiro render precisa
  // ser igual nos dois lados para não quebrar a hidratação.
  if (!hasMounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando vaults...</p>
        </div>
      </div>
    );
  }

  if (!selectedVault) {
    return (
      <div className="min-h-full bg-white px-8 pt-10 dark:bg-[#22272e]">
        <p className="text-[15px] font-extrabold text-[#3c3c3c] dark:text-white">
          Vault não encontrado
        </p>
        <Link
          href="/home/vault"
          className="mt-6 inline-flex text-[13px] font-extrabold uppercase tracking-wide text-[#1cb0f6]"
        >
          Voltar
        </Link>
      </div>
    );
  }

  const vaultBase = `/home/vault/${selectedVault.id}`;

  const tabClass = (tab: typeof activeTab) =>
    cn(
      "py-3 text-[13px] font-extrabold uppercase tracking-wide border-b-4 transition-colors",
      activeTab === tab
        ? "border-[#1cb0f6] text-[#1cb0f6]"
        : "border-transparent text-[#afafaf] hover:text-[#777]"
    );

  return (
    <div className="min-h-full bg-white dark:bg-[#22272e]">
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
          <Link href={vaultBase} className={tabClass("words")}>
            Palavras
          </Link>
          <Link href={`${vaultBase}/relatorio`} className={tabClass("report")}>
            Relatório
          </Link>
          <Link
            href={`${vaultBase}/configuracoes`}
            className={tabClass("settings")}
          >
            Configurações
          </Link>
        </nav>
      </div>

      {activeTab === "words" &&
        (currentWords.length === 0 ? (
          <div className="px-6">
            <VaultOnboarding
              firstName={firstName}
              onAddWords={() => setIsCreateDialogOpen(true)}
              onCreateFlashcards={() =>
                router.push(`/home/vault/${selectedVault?.id}/flashcards`)
              }
            />
          </div>
        ) : (
          selectedVault && (
            <VaultWordsList
              words={currentWords}
              vault={selectedVault}
              vaults={vaults ?? []}
              onAddWord={() => setIsCreateDialogOpen(true)}
            />
          )
        ))}

      {activeTab === "report" && <VaultReport words={currentWords} />}

      {activeTab === "settings" && selectedVault && (
        <div className="px-6">
          <div className="max-w-xl mx-auto py-10 space-y-6">
            <ImportExportWords
              vaultId={selectedVault.id}
              vaultName={selectedVault.name}
              wordCount={currentWords.length}
            />
            <DeleteVaultSettings
              vaultId={selectedVault.id}
              vaultName={selectedVault.name}
            />
          </div>
        </div>
      )}

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

