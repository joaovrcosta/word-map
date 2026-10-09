"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { createVault, type Vault } from "@/actions/actions";
import { publicErrorMessage } from "@/lib/public-error";

function VaultIllustration() {
  return (
    <svg
      viewBox="0 0 220 140"
      className="w-[220px] h-[140px] mx-auto"
      aria-hidden="true"
    >
      <ellipse cx="110" cy="128" rx="70" ry="8" fill="#E5E5E5" />
      <rect x="78" y="86" width="64" height="38" rx="8" fill="#CE82FF" />
      <rect x="86" y="94" width="48" height="6" rx="3" fill="#fff" opacity="0.7" />
      <rect x="86" y="106" width="32" height="6" rx="3" fill="#fff" opacity="0.5" />
      <circle cx="72" cy="62" r="22" fill="#FFC800" />
      <circle cx="64" cy="58" r="3" fill="#4B4B4B" />
      <circle cx="80" cy="58" r="3" fill="#4B4B4B" />
      <path
        d="M64 70c4 6 12 6 16 0"
        fill="none"
        stroke="#4B4B4B"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="54" y="82" width="36" height="40" rx="12" fill="#58CC02" />
      <circle cx="148" cy="54" r="24" fill="#FF8E72" />
      <circle cx="140" cy="50" r="3.2" fill="#4B4B4B" />
      <circle cx="156" cy="50" r="3.2" fill="#4B4B4B" />
      <path
        d="M140 64c5 7 14 7 18 0"
        fill="none"
        stroke="#4B4B4B"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="128" y="76" width="42" height="46" rx="14" fill="#1CB0F6" />
      <rect x="118" y="48" width="18" height="22" rx="4" fill="#FFC800" />
      <path d="M127 48v-10l8 4-8 6" fill="#58CC02" />
      <circle cx="131" cy="34" r="4" fill="#FFC800" />
    </svg>
  );
}

export function CreateVaultWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const canContinue = name.trim().length > 0 && !isLoading;

  const handleBack = () => {
    router.push("/home/vault");
  };

  const handleContinue = async () => {
    if (!canContinue) return;

    setIsLoading(true);
    setError("");

    try {
      const vault = await createVault(name.trim());
      const createdVault: Vault = {
        ...vault,
        words: vault.words ?? [],
      };

      queryClient.setQueryData<Vault[]>(["vaults"], (current) => {
        if (!current) return [createdVault];
        return [
          createdVault,
          ...current.filter((item) => item.id !== createdVault.id),
        ];
      });
      await queryClient.invalidateQueries({ queryKey: ["vaults"] });

      router.push(`/home?vaultId=${createdVault.id}`);
      router.refresh();
    } catch (err) {
      setError(
        publicErrorMessage(
          err,
          "Não foi possível criar o vault. Tente novamente."
        )
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">
      <header className="flex items-center gap-4 px-4 sm:px-8 pt-5 pb-3">
        <button
          type="button"
          onClick={handleBack}
          className="text-[#afafaf] hover:text-[#777] p-2 -ml-2 rounded-full"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-7" strokeWidth={2.5} />
        </button>
        <div className="flex-1 h-4 rounded-full bg-[#e5e5e5] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#58cc02] transition-all duration-300"
            style={{ width: "14%" }}
          />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          <VaultIllustration />
          <h1 className="mt-4 text-center text-[28px] leading-tight font-extrabold text-[#3c3c3c] dark:text-white">
            Criar um vault
          </h1>

          <div className="mt-8">
            <label className="flex items-start gap-3 cursor-pointer">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-[5px] border-[#1cb0f6] bg-white" />
              <span className="text-[15px] font-bold text-[#3c3c3c] dark:text-gray-100">
                Começar novo vault do zero
              </span>
            </label>

            <div className="ml-8 mt-3">
              <label
                htmlFor="vaultName"
                className="block text-[13px] font-bold text-[#3c3c3c] dark:text-gray-200 mb-1.5"
              >
                Nome do vault
              </label>
              <input
                id="vaultName"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleContinue();
                  }
                }}
                placeholder="Ex: Inglês 1"
                autoFocus
                disabled={isLoading}
                className="w-full h-12 rounded-2xl bg-[#f7f7f7] dark:bg-gray-800 border-0 px-4 text-[15px] text-[#3c3c3c] dark:text-white placeholder:text-[#afafaf] outline-none focus:ring-2 focus:ring-[#1cb0f6]/40"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
          )}
        </div>
      </main>

      <footer className="border-t border-[#e5e5e5] dark:border-gray-800 px-4 sm:px-10 py-4 flex justify-end">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className={`min-w-[160px] h-[50px] rounded-2xl px-6 text-sm font-extrabold uppercase tracking-wide transition-all ${
            canContinue
              ? "bg-[#58cc02] text-white border-b-4 border-[#46a302] hover:brightness-105 active:translate-y-[2px] active:border-b-2"
              : "bg-[#e5e5e5] text-[#afafaf] border-b-4 border-[#e5e5e5] cursor-not-allowed"
          }`}
        >
          {isLoading ? "Criando..." : "Continuar"}
        </button>
      </footer>
    </div>
  );
}
