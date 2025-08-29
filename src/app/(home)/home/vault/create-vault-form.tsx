"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createVault } from "../../../../actions/actions";

interface CreateVaultFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function CreateVaultForm({ onSuccess, onCancel }: CreateVaultFormProps) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    setIsLoading(true);

    try {
      await createVault(name.trim());
      setName("");
      onSuccess();
    } catch (error) {
      console.error("Erro ao criar vault:", error);
      alert(
        `Erro ao criar vault: ${
          error instanceof Error ? error.message : "Erro desconhecido"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="vaultName"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Nome do Vault
        </label>
        <Input
          id="vaultName"
          placeholder="Ex: Vocabulário Básico"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
      </div>
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || !name.trim()}>
          {isLoading ? "Criando..." : "Criar Vault"}
        </Button>
      </div>
    </form>
  );
}
