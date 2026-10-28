import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ServerPagePerformance } from "@/lib/performance/server";
import { dashboardSummarySchema } from "@/features/dashboard/schema";

export async function getDashboardData() {
  const perf = new ServerPagePerformance("Dashboard");
  try {
    const supabase = await createSupabaseServerClient(perf);
    const {
      data: { user },
      error: authError,
    } = await perf.measure("auth.getUser", () => supabase.auth.getUser());

    if (authError || !user) {
      redirect("/login");
    }

    const [goalResult, summaryResult] = await Promise.all([
      perf.measure("getGoals", () =>
        supabase
          .from("user_goals")
          .select(
            "daily_calories, daily_protein, daily_carbs, daily_fat, timezone",
          )
          .eq("user_id", user.id)
          .maybeSingle(),
      ),
      perf.measure("getSummary (RPC/SQL + HTTP)", () =>
        supabase.rpc("get_dashboard_summary"),
      ),
    ]);

    if (goalResult.error) {
      console.error("Dashboard goals query failed.", goalResult.error);
      throw new Error("Impossible de charger vos objectifs.");
    }
    if (summaryResult.error) {
      console.error("Dashboard summary query failed.", summaryResult.error);
      throw new Error("Impossible de calculer vos statistiques.");
    }

    const summary = dashboardSummarySchema.safeParse(summaryResult.data);
    if (!summary.success) {
      console.error(
        "Dashboard summary response validation failed.",
        summary.error,
      );
      throw new Error("Les statistiques reçues sont invalides.");
    }

    return {
      email: user.email ?? "",
      goals: goalResult.data ?? {
        daily_calories: 2000,
        daily_protein: 150,
        daily_carbs: 250,
        daily_fat: 70,
        timezone: "UTC",
      },
      summary: summary.data,
    };
  } finally {
    perf.report();
  }
}
