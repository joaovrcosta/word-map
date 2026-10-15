"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  applyPointsDelta,
  POINTS_DELTA_EVENT,
  POINTS_SYNC_EVENT,
} from "@/lib/points-optimistic";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minuto
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    const onDelta = (event: Event) => {
      const delta =
        (event as CustomEvent<{ delta?: number }>).detail?.delta ?? 0;
      applyPointsDelta(queryClient, delta);
    };
    const onSync = () => {
      void queryClient.invalidateQueries({ queryKey: ["ranking"] });
    };

    window.addEventListener(POINTS_DELTA_EVENT, onDelta);
    window.addEventListener(POINTS_SYNC_EVENT, onSync);
    return () => {
      window.removeEventListener(POINTS_DELTA_EVENT, onDelta);
      window.removeEventListener(POINTS_SYNC_EVENT, onSync);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
