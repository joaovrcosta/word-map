"use client";

import { useState, useCallback } from "react";
import { Plus, FolderOpen, Trash, Pencil, Eye } from "@phosphor-icons/react";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  deleteVault,
  updateVaultName,
  type Vault,
} from "../../../../actions/actions";
import { useVaults } from "@/hooks/use-words";

export default function VaultPage() {
  const [editingVault, setEditingVault] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const { data: vaults, isLoading: isLoadingVaults, refetch } = useVaults();

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
        refetch();
      } catch (error) {
        console.error("Erro ao deletar vault:", error);
        alert("Não foi possível excluir o vault. Tente novamente.");
      }
    },
    [refetch]
  );

  const handleEditVault = useCallback((vault: Vault) => {
    setEditingVault({ id: vault.id, name: vault.name });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingVault || !editingVault.name.trim()) return;

    try {
      setIsSaving(true);
      await updateVaultName(editingVault.id, editingVault.name);
      refetch();
      setEditingVault(null);
    } catch (error) {
      console.error("Erro ao editar vault:", error);
      alert("Não foi possível editar o vault. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }, [editingVault, refetch]);

  const handleCancelEdit = useCallback(() => {
    setEditingVault(null);
  }, []);

  const handleViewVault = useCallback(
    (vault: Vault) => {
      router.push(`/home?vaultId=${vault.id}`);
    },
    [router]
  );

  const formatDate = useCallback((date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  }, []);

  if (isLoadingVaults) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1cb0f6] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando vaults...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white dark:bg-gray-950 max-w-full overflow-x-hidden">
      <div className="px-8 pt-5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[26px] leading-none" aria-hidden="true">
              📗
            </span>
            <div>
              <h1 className="text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
                Meus vaults
              </h1>
              <p className="mt-1 text-sm font-bold text-[#afafaf]">
                Organize suas palavras em vaults personalizados
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/create-vault">
              <Plus size={20} />
              Novo vault
            </Link>
          </Button>
        </div>
      </div>

      <div className="px-6 pb-10">
        {!vaults || vaults.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <FolderOpen size={64} className="text-[#1cb0f6] mb-4" />
            <h3 className="text-[22px] font-extrabold text-[#3c3c3c] dark:text-white">
              Nenhum vault criado ainda
            </h3>
            <p className="mt-2 max-w-md text-[#777]">
              Crie seu primeiro vault para começar a organizar suas palavras.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/create-vault">
                <Plus size={20} className="mr-2" />
                Criar meu próprio vault
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {vaults.map((vault) => (
              <div
                key={vault.id}
                className="flex flex-col rounded-2xl border-2 border-[#e5e5e5] bg-white p-5 transition-colors hover:border-[#1cb0f6]/40 dark:border-[#373e47] dark:bg-[#2d333b]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ddf4ff] text-xl">
                    📗
                  </div>
                  <div className="min-w-0 flex-1">
                    {editingVault?.id === vault.id ? (
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
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                        autoFocus
                        disabled={isSaving}
                        className="h-11 rounded-2xl border-2 font-extrabold"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push(`/home/vault/${vault.id}`)}
                        className="block w-full min-w-0 text-left"
                      >
                        <h2 className="truncate text-lg font-extrabold text-[#3c3c3c] dark:text-white">
                          {vault.name}
                        </h2>
                      </button>
                    )}
                    <p className="mt-1 text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf]">
                      {vault.words.length} palavra
                      {vault.words.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-[#afafaf]">
                  <span>Criado {formatDate(vault.createdAt)}</span>
                  <span>Atualizado {formatDate(vault.updatedAt)}</span>
                </div>

                {vault.words.length > 0 && (
                  <div className="mt-4 space-y-2 border-t-2 border-[#e5e5e5] pt-4">
                    {vault.words.slice(0, 3).map((word) => (
                      <div
                        key={word.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate text-sm font-bold text-[#3c3c3c]">
                          {word.name}
                        </span>
                        <span className="shrink-0 rounded-full bg-[#ddf4ff] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-[#1cb0f6]">
                          Nível {word.confidence}
                        </span>
                      </div>
                    ))}
                    {vault.words.length > 3 && (
                      <p className="text-xs font-bold text-[#afafaf]">
                        +{vault.words.length - 3} mais
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-end gap-1 border-t-2 border-[#e5e5e5] pt-3">
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#1cb0f6] hover:bg-[#ddf4ff]"
                    onClick={() =>
                      router.push(`/home/vault/${vault.id}/flashcards`)
                    }
                    title="Estudar com flashcards"
                    aria-label="Flashcards"
                  >
                    <Brain className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#1cb0f6] hover:bg-[#ddf4ff]"
                    onClick={() => handleEditVault(vault)}
                    disabled={isSaving}
                    title="Editar nome"
                    aria-label="Editar vault"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#58cc02] hover:bg-green-50"
                    onClick={() => handleViewVault(vault)}
                    title="Ver palavras"
                    aria-label="Ver palavras"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                    onClick={() => handleDeleteVault(vault.id)}
                    title="Excluir vault"
                    aria-label="Excluir vault"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
