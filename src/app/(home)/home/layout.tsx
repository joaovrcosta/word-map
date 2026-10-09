import { Suspense } from "react";
import AppSidebar from "@/components/sidebar";

export default async function HomedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Suspense
        fallback={
          <div className="hidden lg:block w-[280px] bg-[#f7f7f7] border-r border-[#e5e5e5]" />
        }
      >
        <AppSidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
}
