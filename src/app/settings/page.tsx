import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { SettingsForm } from "@/components/goals/settings-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Objectifs",
};

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: goals, error } = await supabase
    .from("user_goals")
    .select(
      "current_weight_kg, height_cm, age_years, sex, activity_level, goal_type, daily_calories, daily_protein, daily_carbs, daily_fat, timezone",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Settings goals query failed.", error);
    throw new Error("Impossible de charger vos objectifs.");
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <AppHeader />
      <div className="mx-auto max-w-2xl px-5 py-7 pb-32 sm:px-6 sm:py-12 sm:pb-12">
        <header className="mb-8">
          <p className="eyebrow">Réglages</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Objectifs
          </h1>
          <p className="mt-2 max-w-md text-base leading-7 text-muted-foreground">
            Définissez votre cible quotidienne. Les autres réglages sont
            facultatifs.
          </p>
        </header>

        <SettingsForm
          initialValues={{
            current_weight_kg: goals?.current_weight_kg ?? 70,
            height_cm: goals?.height_cm ?? 170,
            age_years: goals?.age_years ?? 30,
            sex: goals?.sex ?? "prefer_not_to_say",
            activity_level: goals?.activity_level ?? "moderately_active",
            goal_type: goals?.goal_type ?? "maintain_weight",
            daily_calories: goals?.daily_calories ?? 2000,
            daily_protein: goals?.daily_protein ?? 150,
            daily_carbs: goals?.daily_carbs ?? 250,
            daily_fat: goals?.daily_fat ?? 70,
            timezone: goals?.timezone ?? "UTC",
          }}
        />
        <p className="mt-6 text-xs leading-5 text-muted-foreground">
          L’estimation utilise l’équation de Mifflin–St Jeor et un coefficient
          d’activité. Elle est informative, ne remplace pas un avis médical et
          peut différer des besoins réels. Les valeurs sont modifiables avant
          enregistrement.
        </p>
      </div>
    </main>
  );
}
