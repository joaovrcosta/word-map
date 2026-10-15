"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/sidebar";
import { AppHeader } from "@/components/app-header";
import { readingBackHref } from "@/lib/reading-route";
import type { VaultNavItem } from "@/types/vault-nav";

export function HomeShell({
  children,
  initialVaults,
}: {
  children: React.ReactNode;
  initialVaults: VaultNavItem[];
}) {
  const pathname = usePathname();
  const reading = Boolean(readingBackHref(pathname));

  return (
    <div className="flex h-screen overflow-hidden">
      {!reading && (
        <Suspense
          fallback={
            <div className="hidden lg:block w-[300px] border-r border-[#e8eaed] bg-white dark:border-[#373e47] dark:bg-[#1c2128]" />
          }
        >
          <AppSidebar initialVaults={initialVaults} />
        </Suspense>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader initialVaults={initialVaults} />
        <main className="flex-1 overflow-y-auto bg-[#f6f7f9] dark:bg-[#22272e]">
          {children}
        </main>
      </div>
    </div>
  );
}
