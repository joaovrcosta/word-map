"use client";

import { useState, useEffect } from "react";
import { Plus, BookOpen, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/words-table/data-table";
import { columns } from "@/components/tables/words-table/columns";
import { getVaults, type Vault, type Word } from "@/actions/actions";
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

export default function HomePage() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [currentVault, setCurrentVault] = useState<Vault | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWord, setNewWord] = useState({
    name: "",
    grammaticalClass: "",
    category: "",
    translations: "",
    confidence: 0,
  });
  const [isCreatingWord, setIsCreatingWord] = useState(false);

  // Buscar vaults e usuário atual
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [vaultsData, currentUser] = await Promise.all([
          getVaults(),
          getCurrentUser(),
        ]);

        setVaults(vaultsData);

        // Se não há vault selecionado, usar o primeiro disponível
        if (vaultsData.length > 0 && !currentVault) {
          setCurrentVault(vaultsData[0]);
          setWords(vaultsData[0].words);
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentVault]);

  // Atualizar palavras quando o vault mudar
  useEffect(() => {
    if (currentVault) {
      setWords(currentVault.words);
    }
  }, [currentVault]);

  const handleVaultChange = (vaultId: string) => {
    const selectedVault = vaults.find((v) => v.id === parseInt(vaultId));
    if (selectedVault) {
      setCurrentVault(selectedVault);
    }
  };

  const handleCreateWord = async () => {
    if (
      !currentVault ||
      !newWord.name.trim() ||
      !newWord.grammaticalClass ||
      !newWord.category
    ) {
      return;
    }

    setIsCreatingWord(true);
    try {
      const wordData = {
        name: newWord.name.trim(),
        grammaticalClass: newWord.grammaticalClass,
        category: newWord.category,
        translations: newWord.translations
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t),
        confidence: newWord.confidence,
        vaultId: currentVault.id,
      };

      const createdWord = await createWord(wordData);

      // Adicionar nova palavra à lista
      setWords((prev) => [...prev, createdWord]);

      // Atualizar o vault atual
      setCurrentVault((prev) =>
        prev
          ? {
              ...prev,
              words: [...prev.words, createdWord],
            }
          : null
      );

      // Limpar formulário e fechar modal
      setNewWord({
        name: "",
        grammaticalClass: "",
        category: "",
        translations: "",
        confidence: 0,
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Erro ao criar palavra:", error);
      alert("Erro ao criar palavra. Tente novamente.");
    } finally {
      setIsCreatingWord(false);
    }
  };

  const stats = [
    {
      title: "Total de Palavras",
      value: words.length,
      icon: BookOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Palavras Salvas",
      value: words.filter((w) => w.isSaved).length,
      icon: Target,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Confiança Média",
      value:
        words.length > 0
          ? Math.round(
              words.reduce((acc, w) => acc + w.confidence, 0) / words.length
            )
          : 0,
      icon: Trophy,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      suffix: "%",
    },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (vaults.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Nenhum vault encontrado
          </h3>
          <p className="mt-2 text-gray-600">
            Crie um vault primeiro para começar a adicionar palavras.
          </p>
          <Button
            className="mt-4"
            onClick={() => (window.location.href = "/home/vault")}
          >
            Criar Vault
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header com seleção de vault */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {currentVault ? currentVault.name : "Selecione um Vault"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gerencie suas palavras e acompanhe seu progresso
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Seletor de Vault */}
          <Select
            value={currentVault?.id.toString()}
            onValueChange={handleVaultChange}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecione um vault" />
            </SelectTrigger>
            <SelectContent>
              {vaults.map((vault) => (
                <SelectItem key={vault.id} value={vault.id.toString()}>
                  {vault.name} ({vault.words.length} palavras)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Botão de adicionar palavra */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus size={20} />
                Nova Palavra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Nova Palavra</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Palavra
                  </label>
                  <Input
                    placeholder="Ex: Hello"
                    value={newWord.name}
                    onChange={(e) =>
                      setNewWord((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                      <SelectItem value="advérbio">Advérbio</SelectItem>
                      <SelectItem value="pronome">Pronome</SelectItem>
                      <SelectItem value="preposição">Preposição</SelectItem>
                      <SelectItem value="conjunção">Conjunção</SelectItem>
                      <SelectItem value="interjeição">Interjeição</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Categoria
                  </label>
                  <Input
                    placeholder="Ex: saudação, tecnologia, comida"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Traduções (separadas por vírgula)
                  </label>
                  <Input
                    placeholder="Ex: olá, oi, hey"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confiança Inicial (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={newWord.confidence}
                    onChange={(e) =>
                      setNewWord((prev) => ({
                        ...prev,
                        confidence: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={isCreatingWord}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateWord}
                    disabled={
                      isCreatingWord ||
                      !newWord.name.trim() ||
                      !newWord.grammaticalClass ||
                      !newWord.category
                    }
                  >
                    {isCreatingWord ? "Criando..." : "Criar Palavra"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border"
          >
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
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
            {words.length} palavra{words.length !== 1 ? "s" : ""} encontrada
            {words.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="p-6">
          {words.length > 0 ? (
            <DataTable columns={columns} data={words} />
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
    </div>
  );
}
