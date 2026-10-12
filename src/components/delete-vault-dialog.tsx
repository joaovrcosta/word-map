"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { deleteVault } from "@/actions/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const CONFIRM_TEXT = "DELETAR";

export function DeleteVaultSettings({
  vaultId,
  vaultName,
}: {
  vaultId: number;
  vaultName: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = confirmation === CONFIRM_TEXT && !isDeleting;

  const close = () => {
    if (isDeleting) return;
    setOpen(false);
    setConfirmation("");
    setError(null);
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteVault(vaultId);
      await queryClient.invalidateQueries({ queryKey: ["vaults"] });
      setOpen(false);
      setConfirmation("");
      router.replace("/home");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Não foi possível deletar o vault."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="rounded-2xl border-2 border-[#e5e5e5] p-5 dark:border-[#373e47]">
      <h2 className="text-[15px] font-extrabold text-[#3c3c3c] dark:text-white">
        Deletar vault
      </h2>
      <p className="mt-1 text-[14px] leading-snug text-[#777] dark:text-[#8b949e]">
        Apaga &quot;{vaultName}&quot; e todas as palavras dele. Essa ação não
        volta.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex h-12 items-center justify-center rounded-2xl border-b-4 border-[#ea2b2b] bg-[#ff4b4b] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105 active:translate-y-0.5 active:border-b-2"
      >
        Deletar vault
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
          else setOpen(true);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-extrabold text-[#3c3c3c] dark:text-white">
              Deletar vault
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-snug text-[#777] dark:text-[#8b949e]">
              Para apagar &quot;{vaultName}&quot;, digite {CONFIRM_TEXT}.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
          >
            <label
              htmlFor="delete-vault-confirmation"
              className="text-[13px] font-extrabold uppercase tracking-wide text-[#afafaf]"
            >
              Confirmação
            </label>
            <Input
              id="delete-vault-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              placeholder={CONFIRM_TEXT}
              className="mt-2 h-12 rounded-2xl border-2 font-extrabold tracking-wide"
              disabled={isDeleting}
            />
            {error ? (
              <p className="mt-2 text-[13px] font-bold text-[#ff4b4b]">{error}</p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={close}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <button
                type="submit"
                disabled={!canDelete}
                className="inline-flex h-12 items-center justify-center rounded-2xl border-b-4 border-[#ea2b2b] bg-[#ff4b4b] px-5 text-sm font-extrabold uppercase tracking-wide text-white hover:brightness-105 disabled:opacity-50 active:translate-y-0.5 active:border-b-2"
              >
                {isDeleting ? "Deletando..." : "Deletar"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
