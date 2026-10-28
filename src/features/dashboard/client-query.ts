import { dashboardGoalsSchema, dashboardSummarySchema } from "./schema";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { DashboardData } from "./schema";

const GOALS_FALLBACK: NonNullable<DashboardData["goals"]> = {
  daily_calories: 2000,
  daily_protein: 150,
  daily_carbs: 250,
  daily_fat: 70,
  timezone: "UTC",
};

function reportClientMeasurements(
  startedAt: number,
  resourceStartIndex: number,
  data: DashboardData,
) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_PERF_LOGS !== "true"
  ) {
    return;
  }

  const resources = performance
    .getEntriesByType("resource")
    .slice(resourceStartIndex)
    .filter(
      (entry): entry is PerformanceResourceTiming =>
        entry instanceof PerformanceResourceTiming &&
        (entry.name.includes("/rest/v1/") || entry.name.includes("/auth/v1/")),
    );
  const restRequests = resources.filter((resource) =>
    resource.name.includes("/rest/v1/"),
  ).length;
  const authRequests = resources.filter((resource) =>
    resource.name.includes("/auth/v1/"),
  ).length;
  const responsePayloadBytes = new TextEncoder().encode(
    JSON.stringify(data),
  ).byteLength;
  const transferBytes = resources.reduce(
    (total, resource) => total + resource.transferSize,
    0,
  );
  const encodedBodyBytes = resources.reduce(
    (total, resource) => total + resource.encodedBodySize,
    0,
  );

  console.info(
    [
      "[PERF DASHBOARD CLIENT]",
      `client data load: ${(performance.now() - startedAt).toFixed(1)}ms`,
      `Supabase requests: ${resources.length} (PostgREST/RPC ${restRequests}, Auth ${authRequests})`,
      `response payload (uncompressed JSON): ${responsePayloadBytes} bytes`,
      `encoded response bodies: ${encodedBodyBytes} bytes`,
      `total transfer: ${transferBytes} bytes (0 may mean cross-origin timing data is unavailable)`,
    ].join("\n"),
  );
}

export async function fetchDashboardClientData(): Promise<DashboardData> {
  const startedAt = performance.now();
  const resourceStartIndex = performance.getEntriesByType("resource").length;
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Dashboard client session lookup failed.", sessionError);
    throw new Error("Impossible de vérifier votre session.");
  }
  if (!session) {
    throw new Error("Votre session a expiré. Reconnectez-vous.");
  }

  const [goalsResult, summaryResult] = await Promise.all([
    supabase
      .from("user_goals")
      .select("daily_calories, daily_protein, daily_carbs, daily_fat, timezone")
      .eq("user_id", session.user.id)
      .maybeSingle(),
    supabase.rpc("get_dashboard_summary"),
  ]);

  if (goalsResult.error) {
    console.error("Dashboard client goals query failed.", goalsResult.error);
    throw new Error("Impossible de charger vos objectifs.");
  }
  if (summaryResult.error) {
    console.error(
      "Dashboard client summary query failed.",
      summaryResult.error,
    );
    throw new Error("Impossible de calculer vos statistiques.");
  }

  const goals = dashboardGoalsSchema.safeParse(goalsResult.data);
  if (!goals.success) {
    console.error("Dashboard client goals validation failed.", goals.error);
    throw new Error("Les objectifs reçus sont invalides.");
  }
  const summary = dashboardSummarySchema.safeParse(summaryResult.data);
  if (!summary.success) {
    console.error("Dashboard client summary validation failed.", summary.error);
    throw new Error("Les statistiques reçues sont invalides.");
  }

  const data = {
    goals: goals.data ?? GOALS_FALLBACK,
    summary: summary.data,
  };
  reportClientMeasurements(startedAt, resourceStartIndex, data);
  return data;
}
