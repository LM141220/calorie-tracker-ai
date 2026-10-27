import type { Metadata } from "next";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { getDashboardData } from "@/features/dashboard/queries";

export const metadata: Metadata = {
  title: "Dashboard",
};

function ProgressMetric({
  label,
  current,
  target,
  unit,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
}) {
  const percentage = Math.min(
    100,
    Math.round((current / Math.max(target, 1)) * 100),
  );
  const formatter = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: unit === "kcal" ? 0 : 1,
  });

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {formatter.format(current)} / {formatter.format(target)} {unit}
        </span>
      </div>
      <div
        aria-label={`${label} : ${percentage} % de l’objectif`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const { email, goals, summary } = await getDashboardData();
  const numberFormat = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  });

  return (
    <main className="min-h-screen bg-muted/30">
      <AppHeader email={email} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Votre journée</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Bonjour, voici votre suivi
            </h1>
            <p className="mt-2 text-muted-foreground">
              {new Intl.DateTimeFormat("fr-FR", {
                dateStyle: "full",
                timeZone: "UTC",
              }).format(new Date(`${summary.today.date}T12:00:00Z`))}
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href="/meal/new"
          >
            Ajouter un repas
          </Link>
        </header>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-2xl border bg-card p-5 sm:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 className="font-semibold">Calories consommées</h2>
                <p className="mt-2 text-4xl font-semibold tracking-tight">
                  {numberFormat.format(summary.today.calories)}
                  <span className="ml-2 text-lg font-normal text-muted-foreground">
                    / {numberFormat.format(goals.daily_calories)} kcal
                  </span>
                </p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                {summary.today.meal_count}{" "}
                {summary.today.meal_count === 1 ? "repas" : "repas"}
              </span>
            </div>
            <div
              aria-label={`Calories : ${Math.min(100, Math.round((summary.today.calories / Math.max(goals.daily_calories, 1)) * 100))} % de l’objectif`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.min(
                100,
                Math.round(
                  (summary.today.calories / Math.max(goals.daily_calories, 1)) *
                    100,
                ),
              )}
              className="mt-6 h-3 overflow-hidden rounded-full bg-muted"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{
                  width: `${Math.min(100, Math.round((summary.today.calories / Math.max(goals.daily_calories, 1)) * 100))}%`,
                }}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {summary.today.calories >= goals.daily_calories
                ? `${numberFormat.format(summary.today.calories - goals.daily_calories)} kcal au-dessus de l’objectif`
                : `${numberFormat.format(goals.daily_calories - summary.today.calories)} kcal restantes`}
            </p>
            <div className="mt-8 space-y-5">
              <ProgressMetric
                current={summary.today.protein}
                label="Protéines"
                target={goals.daily_protein}
                unit="g"
              />
              <ProgressMetric
                current={summary.today.carbs}
                label="Glucides"
                target={goals.daily_carbs}
                unit="g"
              />
              <ProgressMetric
                current={summary.today.fat}
                label="Lipides"
                target={goals.daily_fat}
                unit="g"
              />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <article className="rounded-2xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Moyenne des 7 derniers jours
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {numberFormat.format(summary.weekly_average)}
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  kcal/jour
                </span>
              </p>
            </article>
            <article className="rounded-2xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Moyenne du mois à date
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {numberFormat.format(summary.monthly_average)}
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  kcal/jour
                </span>
              </p>
            </article>
          </section>

          <div className="lg:col-span-2">
            <WeeklyChart
              calorieTarget={goals.daily_calories}
              days={summary.week}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            href="/history"
          >
            Voir l’historique
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            href="/settings"
          >
            Modifier mes objectifs
          </Link>
        </div>
      </div>
    </main>
  );
}
