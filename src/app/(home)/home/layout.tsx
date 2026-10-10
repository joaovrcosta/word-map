import { Suspense } from "react";
import AppSidebar from "@/components/sidebar";
import { AppHeader } from "@/components/app-header";
import { getVaults } from "@/actions/actions";
import type { VaultNavItem } from "@/types/vault-nav";

async function loadVaultNavItems(): Promise<VaultNavItem[]> {
  try {
    const vaults = await getVaults();
    return vaults.map((vault) => ({
      id: vault.id,
      name: vault.name,
      wordCount: vault.words?.length ?? 0,
    }));
  } catch {
    return [];
  }
}

export default async function HomedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialVaults = await loadVaultNavItems();

  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense
        fallback={
          <div className="hidden lg:block w-[300px] border-r border-[#e5e5e5] bg-[#f7f7f7] dark:border-[#373e47] dark:bg-[#1c2128]" />
        }
      >
        <AppSidebar initialVaults={initialVaults} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader initialVaults={initialVaults} />
        <main className="flex-1 overflow-y-auto bg-white dark:bg-[#22272e]">
          {children}
        </main>
      </div>
    </div>
  );
}
