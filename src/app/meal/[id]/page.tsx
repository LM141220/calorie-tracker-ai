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
      <article className="mx-auto max-w-3xl px-4 py-8 pb-28 sm:px-6 sm:py-12 sm:pb-12">
        <Link
          className="text-sm font-medium text-primary hover:underline"
          href="/history"
        >
          ← Historique
        </Link>
        <header className="mb-7 mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{date}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {meal.meal_name}
            </h1>
            <p className="mt-2 text-xl font-medium text-primary">
              {Math.round(totalCalories)} kcal
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              href={`/meal/${meal.id}/edit`}
            >
              Modifier
            </Link>
            <DeleteMealButton mealId={meal.id} />
          </div>
        </header>

        {imagePreviewUrl ? (
          <div className="relative mb-6 aspect-[4/3] max-h-[28rem] overflow-hidden rounded-2xl border bg-card">
            <Image
              alt={`Photo du repas ${meal.meal_name}`}
              className="object-contain"
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 700px"
              src={imagePreviewUrl}
            />
          </div>
        ) : null}

        <section className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="font-semibold">Détail nutritionnel</h2>
          <div className="mt-4 divide-y">
            {items.map((item) => (
              <div
                className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                key={item.id}
              >
                <div>
                  <p className="font-medium">{item.food_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.weight_g} g · P {item.protein} g · G {item.carbs} g ·
                    L {item.fat} g
                  </p>
                </div>
                <p className="font-medium">{Math.round(item.calories)} kcal</p>
              </div>
            ))}
          </div>
        </section>

        {meal.notes ? (
          <section className="mt-4 rounded-2xl border bg-card p-5 sm:p-6">
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
