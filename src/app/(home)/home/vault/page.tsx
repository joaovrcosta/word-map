"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
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

  if (isLoadingVaults) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#1cb0f6]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white dark:bg-[#22272e]">
      <div className="px-8 pt-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[26px] leading-none" aria-hidden="true">
              📗
            </span>
            <h1 className="text-[26px] font-extrabold text-[#3c3c3c] dark:text-white">
              Meus vaults
            </h1>
          </div>
          {vaults && vaults.length > 0 ? (
            <Link
              href="/create-vault"
              className="inline-flex h-12 shrink-0 items-center justify-center rounded-2xl border-b-4 border-[#1899d6] bg-[#1cb0f6] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105 active:translate-y-0.5 active:border-b-2"
            >
              Novo vault
            </Link>
          ) : null}
        </div>

        {!vaults || vaults.length === 0 ? (
          <div className="mx-auto max-w-md py-16 text-center">
            <p className="text-[15px] font-extrabold text-[#3c3c3c] dark:text-white">
              Nenhum vault ainda
            </p>
            <p className="mt-2 text-[14px] leading-snug text-[#777] dark:text-[#8b949e]">
              Crie um vault e adicione palavras para começar.
            </p>
            <Link
              href="/create-vault"
              className="mt-8 inline-flex h-12 min-w-[210px] items-center justify-center rounded-2xl border-b-4 border-[#1899d6] bg-[#1cb0f6] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105 active:translate-y-0.5 active:border-b-2"
            >
              Criar vault
            </Link>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-[#e5e5e5] dark:divide-[#373e47]">
            {vaults.map((vault) => {
              const wordLabel =
                vault.words.length === 1
                  ? "1 palavra"
                  : `${vault.words.length} palavras`;
              const isEditing = editingVault?.id === vault.id;

              return (
                <li
                  key={vault.id}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <Input
                        value={editingVault.name}
                        onChange={(event) =>
                          setEditingVault({
                            ...editingVault,
                            name: event.target.value,
                          })
                        }
                        onBlur={handleSaveEdit}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") handleSaveEdit();
                          if (event.key === "Escape") handleCancelEdit();
                        }}
                        autoFocus
                        disabled={isSaving}
                        className="h-11 max-w-sm rounded-2xl border-2 font-extrabold"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push(`/home/vault/${vault.id}`)}
                        className="block min-w-0 text-left"
                      >
                        <p className="truncate text-[15px] font-extrabold text-[#3c3c3c] dark:text-white">
                          {vault.name}
                        </p>
                        <p className="mt-0.5 text-[14px] text-[#777] dark:text-[#8b949e]">
                          {wordLabel}
                        </p>
                      </button>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleEditVault(vault)}
                      disabled={isSaving}
                      className="text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf] hover:text-[#777]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVault(vault.id)}
                      className="text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf] hover:text-red-500"
                    >
                      Excluir
                    </button>
                    <Link
                      href={`/home/vault/${vault.id}`}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border-b-4 border-[#1899d6] bg-[#1cb0f6] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105 active:translate-y-0.5 active:border-b-2"
                    >
                      Abrir
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
