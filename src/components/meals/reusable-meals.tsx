"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, Star, Utensils } from "lucide-react";
import { useState, useTransition } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { removeFavoriteMealAction } from "@/features/meals/actions";
import { usePerformanceMount } from "@/lib/performance/client";

type ReusableMeal = {
  id: string;
  mealName: string;
  calories: number;
  createdAt: string;
  imagePreviewUrl: string | null;
};

type ReusableMealsProps = {
  recent: ReusableMeal[];
  favorites: ReusableMeal[];
};

const numberFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

export function ReusableMeals({ recent, favorites }: ReusableMealsProps) {
  usePerformanceMount("ReusableMeals");
  return (
    <section className="space-y-5" aria-label="Réutiliser un repas">
      {recent.length > 0 ? (
        <MealList
          icon={<Clock3 aria-hidden="true" className="size-4" />}
          meals={recent}
          title="Récents"
          hrefForMeal={(id) => `/meal/new?reuseMeal=${id}`}
        />
      ) : null}
      {favorites.length > 0 ? (
        <MealList
          icon={<Star aria-hidden="true" className="size-4" />}
          meals={favorites}
          title="Favoris"
          hrefForMeal={(id) => `/meal/new?favoriteMeal=${id}`}
          favorite
        />
      ) : null}
      {recent.length === 0 && favorites.length === 0 ? (
        <p className="rounded-2xl bg-background/80 p-4 text-sm text-muted-foreground">
          Tes repas enregistrés apparaîtront ici pour être réutilisés.
        </p>
      ) : null}
    </section>
  );
}

function MealList({
  icon,
  meals,
  title,
  hrefForMeal,
  favorite = false,
}: {
  icon: ReactNode;
  meals: ReusableMeal[];
  title: string;
  hrefForMeal: (id: string) => string;
  favorite?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function removeFavorite(id: string) {
    setMessage("");
    startTransition(async () => {
      const result = await removeFavoriteMealAction(id);
      setMessage(result.message);
      if (result.success) {
        router.refresh();
      }
    });
  }

  const dateFormat = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
  });

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      <ul className="divide-y divide-border/70">
        {meals.map((meal) => (
          <li className="flex items-center gap-3 py-2.5" key={meal.id}>
            <Link
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={hrefForMeal(meal.id)}
            >
              <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-primary/70">
                {meal.imagePreviewUrl ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="48px"
                    src={meal.imagePreviewUrl}
                    unoptimized
                  />
                ) : (
                  <Utensils aria-hidden="true" className="size-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {meal.mealName}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {favorite
                    ? `${numberFormat.format(meal.calories)} kcal`
                    : `${dateFormat.format(new Date(meal.createdAt))} · ${numberFormat.format(meal.calories)} kcal`}
                </span>
              </span>
            </Link>
            {favorite ? (
              <Button
                aria-label={`Retirer ${meal.mealName} des favoris`}
                disabled={isPending}
                onClick={() => removeFavorite(meal.id)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Star aria-hidden="true" className="size-4 fill-current" />
              </Button>
            ) : null}
            <Link
              aria-label={`Réutiliser ${meal.mealName}`}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
              href={hrefForMeal(meal.id)}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                +
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {message ? (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
