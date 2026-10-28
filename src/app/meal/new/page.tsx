import type { Metadata } from "next";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { MealEditor } from "@/components/meals/meal-editor";
import {
  getFavoriteMealForReuse,
  getMealForReuse,
  getReusableMeals,
} from "@/features/meals/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Ajouter un repas",
};

export default async function NewMealPage({
  searchParams,
}: {
  searchParams: Promise<{ reuseMeal?: string; favoriteMeal?: string }>;
}) {
  const { reuseMeal, favoriteMeal } = await searchParams;
  if (reuseMeal && favoriteMeal) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  if (reuseMeal) {
    const { meal, items, imagePreviewUrl } = await getMealForReuse(
      supabase,
      user,
      reuseMeal,
    );
    return (
      <main className="min-h-screen bg-muted/30">
        <AppHeader />
        <div className="mx-auto max-w-2xl px-5 py-5 pb-32 sm:px-6 sm:py-9 sm:pb-12">
          <Link
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-accent"
            href="/meal/new"
          >
            ← Ajouter un repas
          </Link>
          <header className="mb-5 mt-5">
            <p className="eyebrow">Réutiliser</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Ajuster ce repas
            </h1>
          </header>
          <MealEditor
            initialMeal={{
              id: meal.id,
              mealName: meal.meal_name,
              notes: meal.notes,
              imagePath: meal.image_url,
              imagePreviewUrl,
              items,
            }}
            mode="reuse"
            sourceMealId={meal.id}
          />
        </div>
      </main>
    );
  }

  if (favoriteMeal) {
    const { favorite, items, imagePreviewUrl } = await getFavoriteMealForReuse(
      supabase,
      user,
      favoriteMeal,
    );
    return (
      <main className="min-h-screen bg-muted/30">
        <AppHeader />
        <div className="mx-auto max-w-2xl px-5 py-5 pb-32 sm:px-6 sm:py-9 sm:pb-12">
          <Link
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-accent"
            href="/meal/new"
          >
            ← Ajouter un repas
          </Link>
          <header className="mb-5 mt-5">
            <p className="eyebrow">Réutiliser un favori</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Ajuster ce repas
            </h1>
          </header>
          <MealEditor
            initialMeal={{
              id: favorite.id,
              mealName: favorite.meal_name,
              notes: favorite.notes,
              imagePath: favorite.image_url,
              imagePreviewUrl,
              items,
            }}
            mode="reuse"
            sourceFavoriteId={favorite.id}
          />
        </div>
      </main>
    );
  }

  const reusableMeals = await getReusableMeals(supabase, user);

  return (
    <main className="min-h-screen bg-muted/30">
      <AppHeader />
      <div className="mx-auto max-w-2xl px-5 py-5 pb-32 sm:px-6 sm:py-9 sm:pb-12">
        <Link
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-accent"
          href="/dashboard"
        >
          ← Accueil
        </Link>
        <header className="mb-5 mt-5">
          <p className="eyebrow">On y va</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Ajouter un repas
          </h1>
        </header>
        <MealEditor mode="create" reusableMeals={reusableMeals} />
      </div>
    </main>
  );
}
