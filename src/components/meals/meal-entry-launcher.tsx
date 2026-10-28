"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { Camera, Search, Star, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ReusableMealsData } from "@/features/meals/types";
import type { MealEditorProps } from "@/components/meals/meal-editor";
import { usePerformanceMount } from "@/lib/performance/client";

type EntryMode = "photo" | "text" | "search";

const MealEditor = dynamic(
  () =>
    import("@/components/meals/meal-editor").then(
      (module) => module.MealEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-label="Chargement de l’éditeur"
        aria-busy="true"
        className="h-56 animate-pulse rounded-[1.5rem] bg-muted"
      />
    ),
  },
);

export function ReuseMealEditor(props: {
  mode: "reuse";
  sourceMealId?: string;
  sourceFavoriteId?: string;
  initialMeal: NonNullable<MealEditorProps["initialMeal"]>;
}) {
  return <MealEditor {...props} />;
}

const ReusableMeals = dynamic(
  () =>
    import("@/components/meals/reusable-meals").then(
      (module) => module.ReusableMeals,
    ),
  {
    loading: () => (
      <div
        aria-label="Chargement des repas"
        aria-busy="true"
        className="h-32 animate-pulse rounded-2xl bg-muted"
      />
    ),
  },
);

export function MealEntryLauncher({
  reusableMeals,
  initialMode,
}: {
  reusableMeals?: ReusableMealsData;
  initialMode?: "favorites";
}) {
  usePerformanceMount("MealEntryLauncher");
  const [entryMode, setEntryMode] = useState<EntryMode | "favorites" | null>(
    initialMode ?? null,
  );

  if (entryMode && entryMode !== "favorites") {
    return (
      <div className="space-y-4">
        <Button
          className="min-h-11 rounded-full px-4"
          onClick={() => setEntryMode(null)}
          type="button"
          variant="ghost"
        >
          ← Choisir une méthode
        </Button>
        <MealEditor mode="create" initialEntry={entryMode} />
      </div>
    );
  }

  if (entryMode === "favorites") {
    return (
      <section className="soft-panel space-y-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">À nouveau au menu</p>
            <h2 className="mt-1 text-lg font-semibold">Tes repas</h2>
          </div>
          <Link
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium hover:bg-accent"
            href="/meal/new"
          >
            Retour
          </Link>
        </div>
        {reusableMeals ? (
          <ReusableMeals
            favorites={reusableMeals.favorites}
            recent={reusableMeals.recent}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section
      aria-label="Choisir comment ajouter un repas"
      className="space-y-3"
    >
      <Button
        className="min-h-20 w-full justify-start gap-4 rounded-[1.5rem] bg-primary px-5 text-lg text-primary-foreground shadow-sm hover:bg-primary/95"
        onClick={() => setEntryMode("photo")}
        type="button"
      >
        <Camera aria-hidden="true" className="size-6 text-highlight" />
        Prendre une photo
      </Button>
      <Button
        className="min-h-16 w-full justify-start gap-4 rounded-[1.25rem] bg-card px-5 text-base shadow-sm"
        onClick={() => setEntryMode("text")}
        type="button"
        variant="outline"
      >
        <Type aria-hidden="true" className="size-5 text-primary" />
        Décrire un repas
      </Button>
      <Button
        className="min-h-16 w-full justify-start gap-4 rounded-[1.25rem] bg-card px-5 text-base shadow-sm"
        onClick={() => setEntryMode("search")}
        type="button"
        variant="outline"
      >
        <Search aria-hidden="true" className="size-5 text-primary" />
        Rechercher un aliment
      </Button>
      <Link
        className="inline-flex min-h-16 w-full items-center justify-start gap-4 rounded-[1.25rem] border border-input bg-card px-5 text-base shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        href="/meal/new?showReusable=1"
      >
        <Star aria-hidden="true" className="size-5 text-primary" />
        Repas favoris et récents
      </Link>
    </section>
  );
}
