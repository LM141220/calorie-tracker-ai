import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const IMAGE_BUCKET = "meal-images";
export const HISTORY_PAGE_SIZE = 20;

export async function getMealHistory(page: number) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const from = (page - 1) * HISTORY_PAGE_SIZE;
  const to = from + HISTORY_PAGE_SIZE - 1;
  const [mealsResult, goalsResult] = await Promise.all([
    supabase
      .from("meals")
      .select("id, meal_name, notes, image_url, created_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("user_goals")
      .select("timezone")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const { data: meals, count, error: mealsError } = mealsResult;

  if (mealsError) {
    console.error("Meal history query failed.", mealsError);
    throw new Error("Impossible de charger votre historique.");
  }
  if (goalsResult.error) {
    console.error("History timezone query failed.", goalsResult.error);
    throw new Error("Impossible de charger vos paramètres régionaux.");
  }

  const mealIds = meals.map((meal) => meal.id);
  const itemsResult =
    mealIds.length > 0
      ? await supabase
          .from("meal_items")
          .select("meal_id, calories")
          .in("meal_id", mealIds)
      : { data: [], error: null };

  if (itemsResult.error) {
    console.error("Meal history item query failed.", itemsResult.error);
    throw new Error("Impossible de charger les calories de vos repas.");
  }

  const caloriesByMeal = new Map<string, number>();
  for (const item of itemsResult.data ?? []) {
    caloriesByMeal.set(
      item.meal_id,
      (caloriesByMeal.get(item.meal_id) ?? 0) + item.calories,
    );
  }

  const mealsWithImages = await Promise.all(
    meals.map(async (meal) => {
      if (!meal.image_url) {
        return {
          ...meal,
          calories: caloriesByMeal.get(meal.id) ?? 0,
          imagePreviewUrl: null,
        };
      }

      const { data, error: imageError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .createSignedUrl(meal.image_url, 60 * 10);

      if (imageError) {
        console.error("Meal history signed URL creation failed.", imageError);
        throw new Error(
          "Impossible de charger les photos de votre historique.",
        );
      }

      return {
        ...meal,
        calories: caloriesByMeal.get(meal.id) ?? 0,
        imagePreviewUrl: data.signedUrl,
      };
    }),
  );

  return {
    email: user.email ?? "",
    timezone: goalsResult.data?.timezone ?? "UTC",
    meals: mealsWithImages,
    page,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / HISTORY_PAGE_SIZE)),
  };
}
