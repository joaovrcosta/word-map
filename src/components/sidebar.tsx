"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Lightbulb,
  Lock,
  Network,
  Plus,
} from "lucide-react";
import { getCurrentUser } from "@/actions/auth";
import { useVaults } from "@/hooks/use-words";
import useSidebarStore from "@/store/sidebarStore";

function ClassFlag() {
  return (
    <svg
      viewBox="0 0 16 11"
      className="w-[22px] h-[15px] shrink-0 rounded-[2px] overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
      aria-hidden="true"
    >
      <rect width="16" height="11" fill="#fff" />
      <rect y="0" width="16" height="1.22" fill="#B22234" />
      <rect y="2.44" width="16" height="1.22" fill="#B22234" />
      <rect y="4.88" width="16" height="1.22" fill="#B22234" />
      <rect y="7.32" width="16" height="1.22" fill="#B22234" />
      <rect y="9.76" width="16" height="1.22" fill="#B22234" />
      <rect width="7" height="6" fill="#3C3B6E" />
    </svg>
  );
}

function OwlAvatar() {
  return (
    <svg viewBox="0 0 40 40" className="size-10 shrink-0" aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#58CC02" />
      <circle cx="14" cy="18" r="6" fill="#fff" />
      <circle cx="26" cy="18" r="6" fill="#fff" />
      <circle cx="15" cy="19" r="2.4" fill="#4B4B4B" />
      <circle cx="27" cy="19" r="2.4" fill="#4B4B4B" />
      <path d="M18 25l4-2 4 2-4 3-4-3z" fill="#FFC800" />
    </svg>
  );
}

const menuLinks = [
  {
    name: "Novo vault",
    path: "/create-vault",
    icon: Plus,
  },
  {
    name: "Textos",
    path: "/home/texts",
    icon: FileText,
  },
  {
    name: "Flashcards",
    path: "/home/flashcards",
    icon: Lightbulb,
  },
  {
    name: "Conexões",
    path: "/home/connections",
    icon: Network,
  },
  {
    name: "Configurações",
    path: "/home/profile",
    icon: Lock,
  },
];

export default function AppSidebar() {
  const pathName = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOpen, collapseSidebar, expandSidebar } = useSidebarStore();
  const { data: vaults } = useVaults();
  const [userLabel, setUserLabel] = useState("você");

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user) return;
      const fromEmail = user.email.split("@")[0];
      setUserLabel(fromEmail || user.name.split(" ")[0] || "você");
    });
  }, []);

  const vaultIdFromPath = pathName.match(/^\/home\/vault\/(\d+)/)?.[1];
  const vaultIdFromQuery = searchParams.get("vaultId");
  const selectedVaultId = vaultIdFromPath
    ? Number(vaultIdFromPath)
    : vaultIdFromQuery
      ? Number(vaultIdFromQuery)
      : pathName === "/home"
        ? vaults?.[0]?.id
        : undefined;

  return (
    <aside
      className="relative hidden lg:flex h-screen shrink-0 flex-col bg-[#f7f7f7] dark:bg-gray-900 border-r border-[#e5e5e5] dark:border-gray-800"
      style={{
        width: isOpen ? 300 : 72,
        minWidth: isOpen ? 300 : 72,
        maxWidth: isOpen ? 300 : 72,
      }}
    >
      <button
        type="button"
        onClick={isOpen ? collapseSidebar : expandSidebar}
        className="absolute -right-3 top-[22px] z-20 flex size-6 items-center justify-center rounded-full bg-white border border-[#e5e5e5] text-[#afafaf] shadow-sm hover:text-[#777]"
        aria-label={isOpen ? "Recolher menu" : "Expandir menu"}
      >
        {isOpen ? (
          <ChevronLeft className="size-3.5" strokeWidth={2.5} />
        ) : (
          <ChevronRight className="size-3.5" strokeWidth={2.5} />
        )}
      </button>

      <div className={`pt-5 pb-4 ${isOpen ? "px-5" : "px-2"}`}>
        {isOpen ? (
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="text-left"
          >
            <span className="text-[22px] font-extrabold tracking-tight text-[#1cb0f6]">
              wordmap
            </span>{" "}
            <span className="text-[22px] font-extrabold tracking-tight text-[#afafaf]">
              learn
            </span>
          </button>
        ) : (
          <p className="text-center text-[#1cb0f6] font-extrabold text-lg">w</p>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto pt-1">
        <ul>
          {vaults?.map((vault) => {
            const active = selectedVaultId === vault.id;
            return (
              <li key={vault.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/home?vaultId=${vault.id}`)}
                  className={`flex w-full items-center gap-3 h-12 text-left ${
                    isOpen ? "px-5" : "justify-center px-0"
                  } ${
                    active
                      ? "bg-[#ddf4ff] text-[#1cb0f6]"
                      : "text-[#afafaf] hover:bg-black/[0.03]"
                  }`}
                >
                  <ClassFlag />
                  {isOpen && (
                    <span className="truncate text-[13px] font-extrabold uppercase tracking-wide">
                      {vault.name}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <ul className="mt-2">
          {menuLinks.map((link) => {
            const Icon = link.icon;
            const isCreate = link.path === "/create-vault";
            const active =
              !isCreate &&
              (link.path === "/home"
                ? pathName === "/home" && !selectedVaultId
                : pathName.startsWith(link.path));

            return (
              <li key={link.path}>
                <button
                  type="button"
                  onClick={() => router.push(link.path)}
                  className={`flex w-full items-center gap-3 min-h-12 py-3 text-left ${
                    isOpen ? "px-5" : "justify-center px-0"
                  } ${
                    active
                      ? "bg-[#ddf4ff] text-[#1cb0f6]"
                      : "text-[#afafaf] hover:bg-black/[0.03]"
                  }`}
                >
                  <Icon className="size-5 shrink-0" strokeWidth={2} />
                  {isOpen && (
                    <span className="text-[13px] font-extrabold uppercase tracking-wide leading-tight">
                      {link.name}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto border-t border-[#e5e5e5] dark:border-gray-800">
        <button
          type="button"
          onClick={() => router.push("/home/profile")}
          className={`flex w-full items-center gap-3 py-4 text-left hover:bg-black/[0.03] ${
            isOpen ? "px-5" : "justify-center px-0"
          }`}
        >
          <OwlAvatar />
          {isOpen && (
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-[#777] leading-tight">
                {userLabel}
              </p>
              <p className="text-[12px] font-extrabold uppercase tracking-wide text-[#1cb0f6]">
                Editar
              </p>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
