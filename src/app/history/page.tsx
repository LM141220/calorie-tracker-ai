import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Utensils } from "lucide-react";
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
      <div className="mx-auto max-w-2xl px-5 py-7 pb-32 sm:px-6 sm:py-12 sm:pb-12">
        <header className="mb-9">
          <p className="eyebrow">Tes repas</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Journal
          </h1>
        </header>

        {meals.length === 0 ? (
          <section className="soft-panel px-6 py-14 text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent text-primary">
              <Utensils aria-hidden="true" className="size-7" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">
              Ton journal commence ici
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              Ajoute un repas et tu le retrouveras ici.
            </p>
            <Link
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              href="/meal/new"
            >
              Ajouter un repas{" "}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </section>
        ) : (
          <div className="space-y-9">
            {groupedMeals.map((group) => (
              <section aria-label={group.date} key={group.date}>
                <h2 className="eyebrow mb-3 capitalize">{group.date}</h2>
                <div>
                  {group.meals.map((meal) => (
                    <Link
                      className="group flex min-h-[5.5rem] items-center gap-4 border-b border-border/70 py-3 transition-colors first:border-t hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-5"
                      href={`/meal/${meal.id}`}
                      key={meal.id}
                    >
                      <div className="relative size-[4.25rem] shrink-0 overflow-hidden rounded-2xl bg-accent sm:size-[4.5rem]">
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
                          <span className="flex size-full items-center justify-center text-primary/70">
                            <Utensils aria-hidden="true" className="size-5" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold group-hover:text-primary">
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
