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
  const { goals, summary } = await getDashboardData();
  const numberFormat = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  });

  return (
    <main className="min-h-screen bg-muted/30">
      <AppHeader />
      <div className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:px-6 sm:py-10 sm:pb-12">
        <header className="mb-6">
          <div>
            <p className="text-sm text-muted-foreground">
              {new Intl.DateTimeFormat("fr-FR", {
                dateStyle: "full",
                timeZone: "UTC",
              }).format(new Date(`${summary.today.date}T12:00:00Z`))}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Aujourd’hui
            </h1>
          </div>
        </header>

        <section className="rounded-2xl border bg-card p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium text-muted-foreground">
                Il vous reste
              </h2>
              <p
                className="mt-2 text-5xl font-semibold tabular-nums tracking-tight"
                aria-live="polite"
              >
                {numberFormat.format(
                  Math.max(goals.daily_calories - summary.today.calories, 0),
                )}
                <span className="ml-2 text-xl font-medium text-muted-foreground">
                  kcal
                </span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {numberFormat.format(summary.today.calories)} consommées sur{" "}
                {numberFormat.format(goals.daily_calories)} kcal
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
              {summary.today.meal_count}{" "}
              {summary.today.meal_count === 1 ? "repas" : "repas"}
            </span>
          </div>
          <div
            aria-label={`Calories consommées : ${numberFormat.format(summary.today.calories)} sur ${numberFormat.format(goals.daily_calories)} kcal`}
            aria-valuemax={goals.daily_calories}
            aria-valuemin={0}
            aria-valuenow={Math.min(
              summary.today.calories,
              goals.daily_calories,
            )}
            aria-valuetext={
              summary.today.calories >= goals.daily_calories
                ? `Objectif dépassé de ${numberFormat.format(summary.today.calories - goals.daily_calories)} kcal`
                : `${numberFormat.format(goals.daily_calories - summary.today.calories)} kcal restantes`
            }
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
          {summary.today.calories >= goals.daily_calories ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Objectif dépassé de{" "}
              {numberFormat.format(
                summary.today.calories - goals.daily_calories,
              )}{" "}
              kcal
            </p>
          ) : null}
          <Link
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href="/meal/new"
          >
            + Ajouter un repas
          </Link>
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/history"
          >
            Voir l’historique
          </Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/settings"
          >
            Modifier l’objectif
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          <details className="group rounded-2xl border bg-card">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 font-medium [&::-webkit-details-marker]:hidden">
              <span>Voir mes macros</span>
              <span
                aria-hidden="true"
                className="text-muted-foreground transition-transform group-open:rotate-180"
              >
                ↓
              </span>
            </summary>
            <div className="space-y-5 border-t px-5 py-5">
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
          </details>

          <details className="group rounded-2xl border bg-card">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 font-medium [&::-webkit-details-marker]:hidden">
              <span>Voir mes tendances</span>
              <span
                aria-hidden="true"
                className="text-muted-foreground transition-transform group-open:rotate-180"
              >
                ↓
              </span>
            </summary>
            <div className="space-y-4 border-t px-4 py-5 sm:px-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-xl bg-muted/60 p-4">
                  <p className="text-sm text-muted-foreground">
                    Moyenne sur 7 jours
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {numberFormat.format(summary.weekly_average)} kcal/jour
                  </p>
                </article>
                <article className="rounded-xl bg-muted/60 p-4">
                  <p className="text-sm text-muted-foreground">
                    Moyenne ce mois-ci
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {numberFormat.format(summary.monthly_average)} kcal/jour
                  </p>
                </article>
              </div>
              <WeeklyChart
                calorieTarget={goals.daily_calories}
                days={summary.week}
              />
            </div>
          </details>
        </div>
      </div>
    </main>
  );
}
