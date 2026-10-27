import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const dailyTotalsSchema = z.object({
  date: z.string(),
  meal_count: z.number().int().nonnegative(),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
});

const dashboardSummarySchema = z.object({
  timezone: z.string(),
  today: dailyTotalsSchema,
  weekly_average: z.number().nonnegative(),
  monthly_average: z.number().nonnegative(),
  week: z.array(
    z.object({
      date: z.string(),
      calories: z.number().nonnegative(),
    }),
  ),
});

export async function getDashboardData() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const [goalResult, summaryResult] = await Promise.all([
    supabase
      .from("user_goals")
      .select("daily_calories, daily_protein, daily_carbs, daily_fat, timezone")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.rpc("get_dashboard_summary"),
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
}
