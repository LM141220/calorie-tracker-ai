"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { PageLoading } from "@/components/page-loading";
import { fetchDashboardClientData } from "@/features/dashboard/client-query";
import { recordDashboardContentVisible } from "@/lib/performance/client";

export function DashboardClient() {
  const query = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardClientData,
    retry: 1,
  });

  useEffect(() => {
    if (query.data) {
      recordDashboardContentVisible();
      if (
        !query.isFetchedAfterMount &&
        (process.env.NODE_ENV !== "production" ||
          process.env.NEXT_PUBLIC_PERF_LOGS === "true")
      ) {
        console.info(
          "[PERF DASHBOARD CACHE]\n" +
            "rendered from in-memory cache\n" +
            "Supabase requests for cached data: 0",
        );
      }
    }
  }, [query.data, query.isFetchedAfterMount]);

  if (query.data) {
    return <DashboardView {...query.data} />;
  }

  if (query.isError) {
    return (
      <main className="min-h-screen bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
          <section className="soft-panel p-6" role="alert">
            <h1 className="text-lg font-semibold">Dashboard indisponible</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {query.error instanceof Error
                ? query.error.message
                : "Une erreur inattendue est survenue."}
            </p>
            <button
              className="mt-4 min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
              onClick={() => void query.refetch()}
              type="button"
            >
              Réessayer
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (query.isPending) {
    return <PageLoading variant="dashboard" />;
  }

  return null;
}
