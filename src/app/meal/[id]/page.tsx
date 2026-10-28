import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { DeleteMealButton } from "@/components/meals/delete-meal-button";
import { getOwnedMeal } from "@/features/meals/queries";

export const metadata: Metadata = {
  title: "Détail du repas",
};

export default async function MealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { meal, items, imagePreviewUrl, timezone } = await getOwnedMeal(id);

  if (items.length === 0) {
    notFound();
  }

  const totalCalories = items.reduce((total, item) => total + item.calories, 0);
  const date = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(meal.created_at));

  return (
    <main className="min-h-screen bg-muted/30">
      <AppHeader />
      <article className="mx-auto max-w-2xl px-5 py-6 pb-32 sm:px-6 sm:py-12 sm:pb-12">
        <Link
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-primary hover:bg-accent"
          href="/history"
        >
          ← Journal
        </Link>

        {imagePreviewUrl ? (
          <div className="relative mt-3 aspect-[4/3] max-h-[28rem] overflow-hidden rounded-[1.75rem] bg-muted">
            <Image
              alt={`Photo du repas ${meal.meal_name}`}
              className="object-cover"
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 700px"
              src={imagePreviewUrl}
            />
          </div>
        ) : null}

        <header className="mb-6 mt-6">
          <p className="eyebrow">{date}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {meal.meal_name}
          </h1>
          <div className="hero-panel mt-5 px-5 py-4">
            <div>
              <p className="text-sm text-white/70">Ce repas</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {Math.round(totalCalories)}{" "}
                <span className="text-base font-medium text-white/75">
                  kcal
                </span>
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-secondary px-5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={`/meal/${meal.id}/edit`}
            >
              Modifier
            </Link>
            <DeleteMealButton mealId={meal.id} />
          </div>
        </header>

        <section className="soft-panel p-5 sm:p-6">
          <h2 className="eyebrow">Dans l’assiette</h2>
          <div className="mt-3 divide-y divide-border/70">
            {items.map((item) => (
              <div
                className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-2 last:pb-0"
                key={item.id}
              >
                <div>
                  <p className="font-medium">{item.food_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.weight_g} g · P {item.protein} g · G {item.carbs} g ·
                    L {item.fat} g
                  </p>
                </div>
                <p className="font-semibold tabular-nums">
                  {Math.round(item.calories)} kcal
                </p>
              </div>
            ))}
          </div>
        </section>

        {meal.notes ? (
          <section className="soft-panel mt-4 p-5 sm:p-6">
            <h2 className="font-semibold">Notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {meal.notes}
            </p>
          </section>
        ) : null}
      </article>
    </main>
  );
}
