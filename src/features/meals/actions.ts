"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveMealInputSchema } from "@/validators/meals";

const IMAGE_BUCKET = "meal-images";

export type MealActionResult = {
  success: boolean;
  message: string;
  mealId?: string;
};

export async function saveMealAction(
  input: unknown,
): Promise<MealActionResult> {
  const parsed = saveMealInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Les informations du repas sont invalides.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Votre session a expiré. Reconnectez-vous.",
    };
  }

  const meal = parsed.data;
  if (meal.image_path && meal.image_path.split("/")[0] !== user.id) {
    return {
      success: false,
      message: "L’image sélectionnée n’est pas accessible.",
    };
  }
  if (meal.image_path) {
    const { error: imageAccessError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .createSignedUrl(meal.image_path, 60);
    if (imageAccessError) {
      return {
        success: false,
        message:
          "La photo du repas n’est plus disponible. Téléversez-la à nouveau.",
      };
    }
  }

  let previousImagePath: string | null = null;
  if (meal.id) {
    const { data: existingMeal, error: existingMealError } = await supabase
      .from("meals")
      .select("image_url")
      .eq("id", meal.id)
      .maybeSingle();

    if (existingMealError) {
      console.error("Unable to load meal before update.", existingMealError);
      return { success: false, message: "Impossible de modifier ce repas." };
    }
    if (!existingMeal) {
      return {
        success: false,
        message: "Ce repas n’existe pas ou n’est pas accessible.",
      };
    }

    previousImagePath = existingMeal.image_url;
  }

  const { data: mealId, error: saveError } = await supabase.rpc("save_meal", {
    p_meal_id: meal.id ?? null,
    p_meal_name: meal.meal_name,
    p_notes: meal.notes,
    p_image_path: meal.image_path,
    p_items: meal.items.map((item) => ({
      food_name: item.food_name,
      weight_g: item.weight_g,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    })),
  });

  if (saveError || !mealId) {
    console.error("Atomic meal save failed.", saveError);
    return {
      success: false,
      message:
        "Le repas n’a pas pu être enregistré. Vérifiez les valeurs puis réessayez.",
    };
  }

  if (previousImagePath && previousImagePath !== meal.image_path) {
    const { error: cleanupError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .remove([previousImagePath]);

    if (cleanupError) {
      console.error("Meal image cleanup after update failed.", cleanupError);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath(`/meal/${mealId}`);
  return {
    success: true,
    message: "Repas enregistré.",
    mealId,
  };
}

export async function deleteMealAction(
  mealId: string,
): Promise<MealActionResult> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      mealId,
    )
  ) {
    return { success: false, message: "Identifiant de repas invalide." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Votre session a expiré. Reconnectez-vous.",
    };
  }

  const { data: meal, error: lookupError } = await supabase
    .from("meals")
    .select("image_url")
    .eq("id", mealId)
    .maybeSingle();

  if (lookupError) {
    console.error("Meal lookup before delete failed.", lookupError);
    return { success: false, message: "Impossible de supprimer ce repas." };
  }
  if (!meal) {
    return {
      success: false,
      message: "Ce repas n’existe pas ou n’est pas accessible.",
    };
  }

  const { error: deleteError } = await supabase
    .from("meals")
    .delete()
    .eq("id", mealId)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("Meal delete failed.", deleteError);
    return { success: false, message: "Le repas n’a pas pu être supprimé." };
  }

  if (meal.image_url) {
    const { error: storageError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .remove([meal.image_url]);

    if (storageError) {
      console.error("Meal image cleanup after delete failed.", storageError);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath(`/meal/${mealId}`);
  return { success: true, message: "Repas supprimé." };
}
