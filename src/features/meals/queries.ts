import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ServerPagePerformance } from "@/lib/performance/server";

const IMAGE_BUCKET = "meal-images";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMissingFavoriteTable(error: { code?: string }) {
  return error.code === "PGRST205" || error.code === "42P01";
}

async function createMealImagePreview(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  imagePath: string | null,
  perf: ServerPagePerformance,
) {
  if (!imagePath) {
    return null;
  }
  const { data, error } = await perf.measure("createSignedUrl", () =>
    supabase.storage.from(IMAGE_BUCKET).createSignedUrl(imagePath, 60 * 10),
  );
  if (error) {
    console.error("Meal image signed URL creation failed.", error);
    throw new Error("Impossible de charger la photo de ce repas.");
  }
  return data.signedUrl;
}

export async function getReusableMeals(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  user: User,
  perf: ServerPagePerformance,
) {
  const [recentResult, favoriteResult] = await Promise.all([
    perf.measure("getRecentMeals", () =>
      supabase
        .from("meals")
        .select("id, meal_name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ),
    perf.measure("getFavorites", () =>
      supabase
        .from("favorite_meals")
        .select("id, meal_name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ),
  ]);
  if (recentResult.error) {
    console.error("Recent meals query failed.", recentResult.error);
    throw new Error("Impossible de charger vos repas récents.");
  }
  let favoritesAvailable = true;
  if (favoriteResult.error) {
    if (!isMissingFavoriteTable(favoriteResult.error)) {
      console.error("Favorite meals query failed.", favoriteResult.error);
      throw new Error("Impossible de charger vos repas favoris.");
    }
    console.error(
      "Favorite meals are unavailable because their table is missing.",
      favoriteResult.error,
    );
    favoritesAvailable = false;
  }

  const recentIds = recentResult.data.map((meal) => meal.id);
  const favoriteIds = favoritesAvailable
    ? (favoriteResult.data ?? []).map((meal) => meal.id)
    : [];
  const [recentItemsResult, favoriteItemsResult] = await Promise.all([
    recentIds.length
      ? perf.measure("getRecentMealItems", () =>
          supabase
            .from("meal_items")
            .select("meal_id, calories")
            .in("meal_id", recentIds),
        )
      : Promise.resolve({ data: [], error: null }),
    favoriteIds.length
      ? perf.measure("getFavoriteMealItems", () =>
          supabase
            .from("favorite_meal_items")
            .select("favorite_meal_id, calories")
            .in("favorite_meal_id", favoriteIds),
        )
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (recentItemsResult.error) {
    console.error("Recent meal items query failed.", recentItemsResult.error);
    throw new Error("Impossible de charger le détail de vos repas récents.");
  }
  if (favoriteItemsResult.error) {
    if (isMissingFavoriteTable(favoriteItemsResult.error)) {
      console.error(
        "Favorite meals are unavailable because their items table is missing.",
        favoriteItemsResult.error,
      );
      favoritesAvailable = false;
    } else {
      console.error(
        "Favorite meal items query failed.",
        favoriteItemsResult.error,
      );
      throw new Error("Impossible de charger le détail de vos repas favoris.");
    }
  }

  const recentCalories = new Map<string, number>();
  for (const item of recentItemsResult.data ?? []) {
    recentCalories.set(
      item.meal_id,
      (recentCalories.get(item.meal_id) ?? 0) + item.calories,
    );
  }
  const favoriteCalories = new Map<string, number>();
  for (const item of favoriteItemsResult.data ?? []) {
    favoriteCalories.set(
      item.favorite_meal_id,
      (favoriteCalories.get(item.favorite_meal_id) ?? 0) + item.calories,
    );
  }

  const recent = await Promise.all(
    recentResult.data.map(async (meal) => ({
      id: meal.id,
      mealName: meal.meal_name,
      calories: recentCalories.get(meal.id) ?? 0,
      createdAt: meal.created_at,
      imagePreviewUrl: null,
    })),
  );
  const favorites = favoritesAvailable
    ? await Promise.all(
        (favoriteResult.data ?? []).map(async (meal) => ({
          id: meal.id,
          mealName: meal.meal_name,
          calories: favoriteCalories.get(meal.id) ?? 0,
          createdAt: meal.created_at,
          imagePreviewUrl: null,
        })),
      )
    : [];
  return { recent, favorites, favoritesAvailable };
}

export async function getMealForReuse(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  user: User,
  mealId: string,
  perf: ServerPagePerformance,
) {
  if (!UUID_PATTERN.test(mealId)) {
    notFound();
  }
  const { data: meal, error: mealError } = await perf.measure(
    "getSourceMeal",
    () =>
      supabase
        .from("meals")
        .select("id, meal_name, notes, image_url")
        .eq("id", mealId)
        .eq("user_id", user.id)
        .maybeSingle(),
  );
  if (mealError) {
    console.error("Meal reuse query failed.", mealError);
    throw new Error("Impossible de charger ce repas.");
  }
  if (!meal) {
    notFound();
  }

  const { data: items, error: itemsError } = await perf.measure(
    "getSourceMealItems",
    () =>
      supabase
        .from("meal_items")
        .select("food_name, weight_g, calories, protein, carbs, fat")
        .eq("meal_id", mealId)
        .order("created_at", { ascending: true }),
  );
  if (itemsError) {
    console.error("Meal reuse items query failed.", itemsError);
    throw new Error("Impossible de charger les aliments de ce repas.");
  }
  return {
    meal,
    items,
    imagePreviewUrl: await createMealImagePreview(
      supabase,
      meal.image_url,
      perf,
    ),
  };
}

export async function getFavoriteMealForReuse(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  user: User,
  favoriteMealId: string,
  perf: ServerPagePerformance,
) {
  if (!UUID_PATTERN.test(favoriteMealId)) {
    notFound();
  }
  const { data: favorite, error: favoriteError } = await perf.measure(
    "getFavorite",
    () =>
      supabase
        .from("favorite_meals")
        .select("id, meal_name, notes, image_url, source_meal_id")
        .eq("id", favoriteMealId)
        .eq("user_id", user.id)
        .maybeSingle(),
  );
  if (favoriteError) {
    console.error("Favorite meal reuse query failed.", favoriteError);
    throw new Error("Impossible de charger ce favori.");
  }
  if (!favorite) {
    notFound();
  }

  const { data: items, error: itemsError } = await perf.measure(
    "getFavoriteItems",
    () =>
      supabase
        .from("favorite_meal_items")
        .select(
          "sort_order, food_name, weight_g, calories, protein, carbs, fat",
        )
        .eq("favorite_meal_id", favoriteMealId)
        .order("sort_order", { ascending: true }),
  );
  if (itemsError) {
    console.error("Favorite meal items query failed.", itemsError);
    throw new Error("Impossible de charger les aliments de ce favori.");
  }
  return {
    favorite,
    items: items.map((item) => ({
      food_name: item.food_name,
      weight_g: item.weight_g,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    })),
    imagePreviewUrl: await createMealImagePreview(
      supabase,
      favorite.image_url,
      perf,
    ),
  };
}

export async function getOwnedMeal(
  mealId: string,
  pageName: "MealDetail" | "MealEdit" = "MealDetail",
) {
  const perf = new ServerPagePerformance(pageName);
  try {
    if (!UUID_PATTERN.test(mealId)) {
      notFound();
    }

    const supabase = await createSupabaseServerClient(perf);
    const {
      data: { user },
      error: authError,
    } = await perf.measure("auth.getUser", () => supabase.auth.getUser());
    if (authError || !user) {
      redirect("/login");
    }

    const { data: meal, error: mealError } = await perf.measure("getMeal", () =>
      supabase
        .from("meals")
        .select("id, meal_name, notes, image_url, created_at")
        .eq("id", mealId)
        .maybeSingle(),
    );

    if (mealError) {
      console.error("Meal query failed.", mealError);
      throw new Error("Impossible de charger ce repas.");
    }
    if (!meal) {
      notFound();
    }

    const [itemsResult, goalsResult, favoriteResult] = await Promise.all([
      perf.measure("getMealItems", () =>
        supabase
          .from("meal_items")
          .select("id, food_name, weight_g, calories, protein, carbs, fat")
          .eq("meal_id", mealId)
          .order("created_at", { ascending: true }),
      ),
      perf.measure("getTimezone", () =>
        supabase
          .from("user_goals")
          .select("timezone")
          .eq("user_id", user.id)
          .maybeSingle(),
      ),
      perf.measure("getFavoriteStatus", () =>
        supabase
          .from("favorite_meals")
          .select("id")
          .eq("source_meal_id", mealId)
          .maybeSingle(),
      ),
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
    if (favoriteResult.error) {
      console.error("Meal favorite status query failed.", favoriteResult.error);
      throw new Error("Impossible de charger le statut du favori.");
    }

    const result = {
      meal,
      items,
      timezone: goalsResult.data?.timezone ?? "UTC",
      imagePreviewUrl: await createMealImagePreview(
        supabase,
        meal.image_url,
        perf,
      ),
      isFavorite: Boolean(favoriteResult.data),
    };
    return result;
  } finally {
    perf.report();
  }
}
