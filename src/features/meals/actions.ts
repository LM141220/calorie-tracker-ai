"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ReusableFood, ReusableFoodsData } from "@/features/meals/types";
import { saveMealInputSchema } from "@/validators/meals";
import { getApprovedUser } from "@/lib/auth/account-access";

const IMAGE_BUCKET = "meal-images";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MealActionResult = {
  success: boolean;
  message: string;
  mealId?: string;
};

export type ReusableFoodsActionResult =
  | { success: true; data: ReusableFoodsData }
  | { success: false; message: string };

function toReusableFood(food: ReusableFood): ReusableFood {
  return {
    food_name: food.food_name,
    weight_g: Number(food.weight_g),
    calories: Number(food.calories),
    protein: Number(food.protein),
    carbs: Number(food.carbs),
    fat: Number(food.fat),
  };
}

export async function getReusableFoodsAction(): Promise<ReusableFoodsActionResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getApprovedUser(supabase);
  if (!user) {
    return {
      success: false,
      message: "Votre compte doit être approuvé pour utiliser cette fonction.",
    };
  }

  const [mealsResult, favoritesResult] = await Promise.all([
    supabase
      .from("meals")
      .select("id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("favorite_foods")
      .select("food_name, weight_g, calories, protein, carbs, fat")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (mealsResult.error) {
    console.error(
      "Reusable food source meals query failed.",
      mealsResult.error,
    );
    return {
      success: false,
      message: "Impossible de charger vos aliments récents.",
    };
  }
  if (favoritesResult.error) {
    console.error(
      "Reusable foods favorites query failed.",
      favoritesResult.error,
    );
    return {
      success: false,
      message: "Impossible de charger vos aliments favoris.",
    };
  }

  const meals = mealsResult.data;
  const recentItemsResult = meals.length
    ? await supabase
        .from("meal_items")
        .select(
          "meal_id, food_name, weight_g, calories, protein, carbs, fat, created_at",
        )
        .in(
          "meal_id",
          meals.map((meal) => meal.id),
        )
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (recentItemsResult.error) {
    console.error(
      "Reusable recent foods query failed.",
      recentItemsResult.error,
    );
    return {
      success: false,
      message: "Impossible de charger vos aliments récents.",
    };
  }

  const mealOrder = new Map(meals.map((meal, index) => [meal.id, index]));
  const seenFoodNames = new Set<string>();
  const recent = (recentItemsResult.data ?? [])
    .slice()
    .sort(
      (left, right) =>
        (mealOrder.get(left.meal_id) ?? Number.MAX_SAFE_INTEGER) -
        (mealOrder.get(right.meal_id) ?? Number.MAX_SAFE_INTEGER),
    )
    .filter((item) => {
      const key = item.food_name.trim().toLocaleLowerCase("fr");
      if (seenFoodNames.has(key)) {
        return false;
      }
      seenFoodNames.add(key);
      return true;
    })
    .slice(0, 12)
    .map((item) =>
      toReusableFood({
        food_name: item.food_name,
        weight_g: item.weight_g,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      }),
    );

  return {
    success: true,
    data: {
      recent,
      favorites: favoritesResult.data.map((food) =>
        toReusableFood({
          food_name: food.food_name,
          weight_g: food.weight_g,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        }),
      ),
    },
  };
}

export async function setFoodFavoriteAction(
  mealItemId: string,
  isFavorite: boolean,
): Promise<MealActionResult> {
  if (
    typeof mealItemId !== "string" ||
    !UUID_PATTERN.test(mealItemId) ||
    typeof isFavorite !== "boolean"
  ) {
    return { success: false, message: "Identifiant d’aliment invalide." };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getApprovedUser(supabase);
  if (!user) {
    return {
      success: false,
      message: "Votre compte doit être approuvé pour utiliser cette fonction.",
    };
  }

  const { data: item, error: itemError } = await supabase
    .from("meal_items")
    .select("meal_id, food_name, weight_g, calories, protein, carbs, fat")
    .eq("id", mealItemId)
    .maybeSingle();
  if (itemError) {
    console.error("Favorite food source lookup failed.", itemError);
    return { success: false, message: "Impossible de charger cet aliment." };
  }
  if (!item) {
    return { success: false, message: "Cet aliment n’existe plus." };
  }

  const { data: meal, error: mealError } = await supabase
    .from("meals")
    .select("id")
    .eq("id", item.meal_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (mealError) {
    console.error("Favorite food ownership check failed.", mealError);
    return {
      success: false,
      message: "Impossible de mettre à jour ce favori.",
    };
  }
  if (!meal) {
    return { success: false, message: "Cet aliment n’est pas accessible." };
  }

  let mutationError: { code?: string; message: string } | null = null;
  if (isFavorite) {
    const { error } = await supabase.from("favorite_foods").insert({
      user_id: user.id,
      food_name: item.food_name,
      weight_g: item.weight_g,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    });
    mutationError = error;
  } else {
    const { error } = await supabase
      .from("favorite_foods")
      .delete()
      .eq("user_id", user.id)
      .eq("food_name", item.food_name)
      .eq("weight_g", item.weight_g)
      .eq("calories", item.calories)
      .eq("protein", item.protein)
      .eq("carbs", item.carbs)
      .eq("fat", item.fat);
    mutationError = error;
  }

  if (mutationError && !(isFavorite && mutationError.code === "23505")) {
    console.error("Favorite food update failed.", mutationError);
    return {
      success: false,
      message: "Impossible de mettre à jour cet aliment favori.",
    };
  }

  revalidatePath("/meal/new");
  revalidatePath(`/meal/${item.meal_id}`);
  return {
    success: true,
    message: isFavorite
      ? "Aliment ajouté aux favoris."
      : "Aliment retiré des favoris.",
  };
}

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
  const user = await getApprovedUser(supabase);
  if (!user) {
    return {
      success: false,
      message: "Votre compte doit être approuvé pour utiliser cette fonction.",
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
  const user = await getApprovedUser(supabase);
  if (!user) {
    return {
      success: false,
      message: "Votre compte doit être approuvé pour utiliser cette fonction.",
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
  const user = await getApprovedUser(supabase);
  if (!user) {
    return {
      success: false,
      message: "Votre compte doit être approuvé pour utiliser cette fonction.",
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
  const user = await getApprovedUser(supabase);
  if (!user) {
    return {
      success: false,
      message: "Votre compte doit être approuvé pour utiliser cette fonction.",
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
