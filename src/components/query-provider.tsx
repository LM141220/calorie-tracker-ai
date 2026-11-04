"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { clearPrivatePageCaches } from "@/lib/pwa/private-page-cache";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      }),
  );

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let activeUserId: string | undefined;
    const clearPrivateCaches = () => {
      void clearPrivatePageCaches().catch((error: unknown) => {
        console.error("Could not clear private offline caches.", error);
      });
    };

    clearPrivateCaches();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user.id;
      if (
        event === "SIGNED_OUT" ||
        event === "SIGNED_IN" ||
        (activeUserId && nextUserId && activeUserId !== nextUserId)
      ) {
        queryClient.clear();
        clearPrivateCaches();
      }
      activeUserId = nextUserId;
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
