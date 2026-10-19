"use client";

import { logoutUser } from "@/actions/auth";
import { LogOut } from "lucide-react";
import { useState } from "react";

export default function LogoutButton({
  appearance = "header",
  expanded = true,
}: {
  appearance?: "header" | "sidebar";
  expanded?: boolean;
}) {
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setPending(true);
    try {
      await logoutUser();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
    window.location.assign("/login");
  };

  if (appearance === "sidebar") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        aria-label="Sair"
        className={`flex w-full items-center gap-3 py-3 text-left text-[#6e7780] hover:bg-black/[0.03] disabled:opacity-60 dark:text-[#8b949e] dark:hover:bg-white/5 ${
          expanded ? "px-5" : "justify-center px-0"
        }`}
      >
        <LogOut className="size-5 shrink-0" strokeWidth={2} />
        {expanded && (
          <span className="text-[15px] font-bold leading-tight">Sair</span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[13px] font-bold text-[#555] hover:bg-black/[0.04] disabled:opacity-60 dark:text-zinc-200 dark:hover:bg-white/5"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sair
    </button>
  );
}
