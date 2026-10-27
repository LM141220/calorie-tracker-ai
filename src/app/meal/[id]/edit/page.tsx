import type { Metadata } from "next";
import Link from "next/link";

import { MealEditor } from "@/components/meals/meal-editor";
import { getOwnedMeal } from "@/features/meals/queries";

export const metadata: Metadata = {
  title: "Modifier un repas",
};

export default async function EditMealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { meal, items, imagePreviewUrl } = await getOwnedMeal(id);

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          className="text-sm font-medium text-primary hover:underline"
          href={`/meal/${meal.id}`}
        >
          ← Détail du repas
        </Link>
        <header className="mb-8 mt-6">
          <p className="text-sm font-medium text-primary">Modifier le suivi</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Modifier le repas
          </h1>
        </header>
        <MealEditor
          initialMeal={{
            id: meal.id,
            mealName: meal.meal_name,
            notes: meal.notes,
            imagePath: meal.image_url,
            imagePreviewUrl,
            items: items.map((item) => ({
              food_name: item.food_name,
              weight_g: item.weight_g,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
            })),
          }}
        />
      </div>
    </main>
  );
}
