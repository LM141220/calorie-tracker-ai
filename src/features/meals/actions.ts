"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveMealInputSchema } from "@/validators/meals";

const IMAGE_BUCKET = "meal-images";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MealActionResult = {
  success: boolean;
  message: string;
  mealId?: string;
};

async function removeImageIfUnused(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  imagePath: string,
) {
  const [mealReference, favoriteReference] = await Promise.all([
    supabase.from("meals").select("id").eq("image_url", imagePath).limit(1),
    supabase
      .from("favorite_meals")
      .select("id")
      .eq("image_url", imagePath)
      .limit(1),
  ]);
  if (mealReference.error || favoriteReference.error) {
    console.error("Unable to check whether a meal image is still referenced.", {
      mealError: mealReference.error,
      favoriteError: favoriteReference.error,
    });
    return;
  }
  if (
    (mealReference.data?.length ?? 0) > 0 ||
    (favoriteReference.data?.length ?? 0) > 0
  ) {
    return;
  }

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .remove([imagePath]);
  if (error) {
    console.error("Meal image cleanup failed.", error);
  }
}

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
    p_source_meal_id: meal.source_meal_id ?? null,
    p_source_favorite_id: meal.source_favorite_id ?? null,
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
    await removeImageIfUnused(supabase, previousImagePath);
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

export async function setMealFavoriteAction(
  mealId: string,
  isFavorite: boolean,
): Promise<MealActionResult> {
  if (!UUID_PATTERN.test(mealId)) {
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

  let previousImagePath: string | null = null;
  if (!isFavorite) {
    const { data, error } = await supabase
      .from("favorite_meals")
      .select("image_url")
      .eq("source_meal_id", mealId)
      .maybeSingle();
    if (error) {
      console.error("Favorite lookup failed.", error);
      return {
        success: false,
        message: "Impossible de mettre à jour ce favori.",
      };
    }
    previousImagePath = data?.image_url ?? null;
  }

  const { error } = await supabase.rpc("set_meal_favorite", {
    p_meal_id: mealId,
    p_is_favorite: isFavorite,
  });
  if (error) {
    console.error("Meal favorite update failed.", error);
    return {
      success: false,
      message: "Impossible de mettre à jour ce favori.",
    };
  }

  if (previousImagePath) {
    await removeImageIfUnused(supabase, previousImagePath);
  }

  revalidatePath("/meal/new");
  revalidatePath("/history");
  revalidatePath(`/meal/${mealId}`);
  return {
    success: true,
    message: isFavorite
      ? "Repas ajouté aux favoris."
      : "Repas retiré des favoris.",
  };
}

export async function removeFavoriteMealAction(
  favoriteMealId: string,
): Promise<MealActionResult> {
  if (!UUID_PATTERN.test(favoriteMealId)) {
    return { success: false, message: "Identifiant de favori invalide." };
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

  const { data: favorite, error: lookupError } = await supabase
    .from("favorite_meals")
    .select("image_url")
    .eq("id", favoriteMealId)
    .maybeSingle();
  if (lookupError) {
    console.error("Favorite lookup before deletion failed.", lookupError);
    return {
      success: false,
      message: "Impossible de supprimer ce favori.",
    };
  }
  if (!favorite) {
    return { success: false, message: "Ce favori n’existe pas." };
  }

  const { error: deleteError } = await supabase.rpc("delete_favorite_meal", {
    p_favorite_meal_id: favoriteMealId,
  });
  if (deleteError) {
    console.error("Favorite deletion failed.", deleteError);
    return {
      success: false,
      message: "Le favori n’a pas pu être supprimé.",
    };
  }

  if (favorite.image_url) {
    await removeImageIfUnused(supabase, favorite.image_url);
  }

  revalidatePath("/meal/new");
  revalidatePath("/history");
  return { success: true, message: "Favori supprimé." };
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
    await removeImageIfUnused(supabase, meal.image_url);
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/meal/new");
  revalidatePath(`/meal/${mealId}`);
  return { success: true, message: "Repas supprimé." };
}
