"use client";

import { useState, useCallback } from "react";
import { Plus, FolderOpen, Trash, Pencil, Eye } from "@phosphor-icons/react";
import { Brain } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import {
  deleteVault,
  updateVaultName,
  type Vault,
} from "../../../../actions/actions";
import { CreateVaultForm } from "./create-vault-form";
import { useVaults } from "@/hooks/use-words";

export default function VaultPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingVault, setEditingVault] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  // Usar hook otimizado com cache
  const { data: vaults, isLoading: isLoadingVaults, refetch } = useVaults();

  // Deletar vault usando Server Action
  const handleDeleteVault = useCallback(
    async (vaultId: number) => {
      if (
        !confirm(
          "Tem certeza que deseja excluir este vault? Esta ação não pode ser desfeita e todas as palavras e conexões serão perdidas."
        )
      )
        return;

      try {
        await deleteVault(vaultId);

        // Recarregar dados do cache
        refetch();
      } catch (error) {
        console.error("Erro ao deletar vault:", error);
        alert("Erro ao deletar vault. Tente novamente.");
      }
    },
    [refetch]
  );

  // Editar nome do vault
  const handleEditVault = useCallback((vault: Vault) => {
    setEditingVault({ id: vault.id, name: vault.name });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingVault || !editingVault.name.trim()) return;

    try {
      setIsEditing(true);
      await updateVaultName(editingVault.id, editingVault.name);

      // Recarregar dados do cache
      refetch();
      setEditingVault(null);
    } catch (error) {
      console.error("Erro ao editar vault:", error);
      alert("Erro ao editar vault. Tente novamente.");
    } finally {
      setIsEditing(false);
    }
  }, [editingVault, refetch]);

  const handleCancelEdit = useCallback(() => {
    setEditingVault(null);
  }, []);

  // Visualizar vault (navegar para home com vault selecionado)
  const handleViewVault = useCallback(
    (vault: Vault) => {
      // Navegar para a página home com o vault selecionado
      router.push(`/home?vaultId=${vault.id}`);
    },
    [router]
  );

  // Recarregar vaults após criação
  const handleVaultCreated = useCallback(async () => {
    setIsCreateDialogOpen(false);
    refetch();
  }, [refetch]);

  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  }, []);

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
      {!vaults || vaults.length === 0 ? (
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
          {vaults?.map((vault) => (
            <Card key={vault.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      {editingVault?.id === vault.id && isEditing ? (
                        <Input
                          value={editingVault.name}
                          onChange={(e) =>
                            setEditingVault({
                              ...editingVault,
                              name: e.target.value,
                            })
                          }
                          onBlur={handleSaveEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSaveEdit();
                            } else if (e.key === "Escape") {
                              handleCancelEdit();
                            }
                          }}
                          autoFocus
                          className="w-full"
                        />
                      ) : (
                        vault.name
                      )}
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
                      onClick={() =>
                        router.push(`/home/vault/${vault.id}/flashcards`)
                      }
                      title="Estudar com Flashcards"
                    >
                      <Brain size={16} className="text-purple-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleDeleteVault(vault.id)}
                    >
                      <Trash size={16} className="text-red-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEditVault(vault)}
                      disabled={isEditing}
                    >
                      <Pencil size={16} className="text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleViewVault(vault)}
                    >
                      <Eye size={16} className="text-green-500" />
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
