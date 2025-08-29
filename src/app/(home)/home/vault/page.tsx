"use client";

import { useState, useEffect } from "react";
import { Plus, FolderOpen, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getVaults,
  deleteVault,
  type Vault,
  type Word,
} from "../../../../actions/actions";
import { CreateVaultForm } from "./create-vault-form";

export default function VaultPage() {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoadingVaults, setIsLoadingVaults] = useState(true);

  // Buscar vaults usando Server Action
  const fetchVaults = async () => {
    try {
      setIsLoadingVaults(true);
      const vaultsData = await getVaults();
      setVaults(vaultsData);
    } catch (error) {
      console.error("Erro ao buscar vaults:", error);
      // Em caso de erro, manter os dados mockados como fallback
      const mockVaults: Vault[] = [
        {
          id: 1,
          name: "Vocabulário Básico",
          createdAt: new Date("2024-01-15"),
          updatedAt: new Date("2024-01-20"),
          userId: 1,
          words: [
            {
              id: 1,
              name: "Hello",
              grammaticalClass: "interjeição",
              category: "saudação",
              translations: ["olá", "oi"],
              confidence: 85,
              isSaved: true,
            },
            {
              id: 2,
              name: "Beautiful",
              grammaticalClass: "adjetivo",
              category: "aparência",
              translations: ["bonito", "lindo"],
              confidence: 70,
              isSaved: true,
            },
          ],
        },
      ];
      setVaults(mockVaults);
    } finally {
      setIsLoadingVaults(false);
    }
  };

  useEffect(() => {
    fetchVaults();
  }, []);

  // Deletar vault usando Server Action
  const handleDeleteVault = async (vaultId: number) => {
    if (!confirm("Tem certeza que deseja excluir este vault?")) return;

    try {
      await deleteVault(vaultId);

      // Remover o vault da lista local
      setVaults((prev) => prev.filter((vault) => vault.id !== vaultId));
    } catch (error) {
      console.error("Erro ao excluir vault:", error);
      alert(
        `Erro ao deletar vault: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    }
  };

  // Recarregar vaults após criação
  const handleVaultCreated = async () => {
    setIsCreateDialogOpen(false);
    await fetchVaults();
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  if (isLoadingVaults) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando vaults...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Meus Vaults
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Organize suas palavras em vaults personalizados
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus size={20} />
              Novo Vault
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Vault</DialogTitle>
            </DialogHeader>
            <CreateVaultForm
              onSuccess={handleVaultCreated}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Vaults */}
      {vaults.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen size={64} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nenhum vault criado ainda
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Crie seu primeiro vault para começar a organizar suas palavras
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus size={20} className="mr-2" />
            Criar Primeiro Vault
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vaults.map((vault) => (
            <Card key={vault.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      {vault.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                      {vault.words.length} palavra
                      {vault.words.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDeleteVault(vault.id)}
                    >
                      <Trash size={16} className="text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Criado em:</span>
                    <span>{formatDate(vault.createdAt)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Atualizado em:</span>
                    <span>{formatDate(vault.updatedAt)}</span>
                  </div>

                  {vault.words.length > 0 && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Palavras recentes:
                      </p>
                      <div className="space-y-1">
                        {vault.words.slice(0, 3).map((word) => (
                          <div
                            key={word.id}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-gray-600 dark:text-gray-400">
                              {word.name}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                word.confidence >= 80
                                  ? "bg-green-100 text-green-800"
                                  : word.confidence >= 60
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {word.confidence}%
                            </span>
                          </div>
                        ))}
                        {vault.words.length > 3 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            +{vault.words.length - 3} mais
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
