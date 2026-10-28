import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { getMealHistory } from "@/features/history/queries";

export const metadata: Metadata = {
  title: "Historique des repas",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const parsedPage = pageParam ? Number(pageParam) : 1;
  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    notFound();
  }

  const { meals, page, timezone, totalPages } =
    await getMealHistory(parsedPage);
  if (page > totalPages && page !== 1) {
    notFound();
  }

  const numberFormat = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  });
  const dateFormat = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeZone: timezone,
  });
  const timeFormat = new Intl.DateTimeFormat("fr-FR", {
    timeStyle: "short",
    timeZone: timezone,
  });
  const groupedMeals = meals.reduce<
    Array<{ date: string; meals: typeof meals }>
  >((groups, meal) => {
    const date = dateFormat.format(new Date(meal.created_at));
    const lastGroup = groups[groups.length - 1];

    if (lastGroup?.date === date) {
      lastGroup.meals.push(meal);
    } else {
      groups.push({ date, meals: [meal] });
    }

    return groups;
  }, []);

  return (
    <main className="min-h-screen bg-muted/30">
      <AppHeader />
      <div className="mx-auto max-w-5xl px-4 py-8 pb-28 sm:px-6 sm:py-12 sm:pb-12">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Historique
            </h1>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/meal/new"
          >
            Ajouter un repas
          </Link>
        </header>

        {meals.length === 0 ? (
          <section className="mt-8 rounded-2xl border bg-card px-6 py-14 text-center">
            <h2 className="text-lg font-semibold">Votre historique est vide</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ajoutez votre premier repas pour commencer votre suivi.
            </p>
            <Link
              className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              href="/meal/new"
            >
              Ajouter un repas
            </Link>
          </section>
        ) : (
          <div className="mt-8 space-y-7">
            {groupedMeals.map((group) => (
              <section aria-label={group.date} key={group.date}>
                <h2 className="mb-3 text-sm font-semibold capitalize text-muted-foreground">
                  {group.date}
                </h2>
                <div className="space-y-2">
                  {group.meals.map((meal) => (
                    <Link
                      className="group flex min-h-20 items-center gap-3 rounded-2xl border bg-card p-3 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-4"
                      href={`/meal/${meal.id}`}
                      key={meal.id}
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-16">
                        {meal.imagePreviewUrl ? (
                          <Image
                            alt=""
                            className="object-cover"
                            fill
                            unoptimized
                            sizes="64px"
                            src={meal.imagePreviewUrl}
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
                            Repas
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-medium group-hover:text-primary">
                          {meal.meal_name}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {timeFormat.format(new Date(meal.created_at))}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold tabular-nums">
                        {numberFormat.format(meal.calories)} kcal
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <nav
            aria-label="Pages d’historique"
            className="mt-8 flex items-center justify-between"
          >
            {page > 1 ? (
              <Link
                className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
                href={`/history?page=${page - 1}`}
              >
                ← Précédent
              </Link>
            ) : (
              <span />
            )}
            <span className="text-sm text-muted-foreground">
              Page {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                className="rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
                href={`/history?page=${page + 1}`}
              >
                Suivant →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </div>
    </main>
  );
}
