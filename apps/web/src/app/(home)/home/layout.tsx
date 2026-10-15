import { HomeShell } from "@/components/home-shell";
import { getVaults } from "@/actions/actions.server";
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

  return <HomeShell initialVaults={initialVaults}>{children}</HomeShell>;
}
