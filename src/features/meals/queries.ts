import { notFound, redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const IMAGE_BUCKET = "meal-images";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getOwnedMeal(mealId: string) {
  if (!UUID_PATTERN.test(mealId)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: meal, error: mealError } = await supabase
    .from("meals")
    .select("id, meal_name, notes, image_url, created_at")
    .eq("id", mealId)
    .maybeSingle();

  if (mealError) {
    console.error("Meal query failed.", mealError);
    throw new Error("Impossible de charger ce repas.");
  }
  if (!meal) {
    notFound();
  }

  const [itemsResult, goalsResult] = await Promise.all([
    supabase
      .from("meal_items")
      .select("id, food_name, weight_g, calories, protein, carbs, fat")
      .eq("meal_id", mealId)
      .order("created_at", { ascending: true }),
    supabase
      .from("user_goals")
      .select("timezone")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const { data: items, error: itemsError } = itemsResult;

  if (itemsError) {
    console.error("Meal item query failed.", itemsError);
    throw new Error("Impossible de charger les aliments de ce repas.");
  }
  if (goalsResult.error) {
    console.error("Meal timezone query failed.", goalsResult.error);
    throw new Error("Impossible de charger vos paramètres régionaux.");
  }

  let imagePreviewUrl: string | null = null;
  if (meal.image_url) {
    const { data, error: imageError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .createSignedUrl(meal.image_url, 60 * 10);

    if (imageError) {
      console.error("Meal image signed URL creation failed.", imageError);
      throw new Error("Impossible de charger la photo de ce repas.");
    }

    imagePreviewUrl = data.signedUrl;
  }

  return {
    meal,
    items,
    timezone: goalsResult.data?.timezone ?? "UTC",
    imagePreviewUrl,
  };
}
