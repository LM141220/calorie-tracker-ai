import { z } from "zod";

import {
  foodSearchResultSchema,
  type FoodSearchResult,
} from "@/validators/foods";

const openFoodFactsResponseSchema = z.object({
  products: z
    .array(
      z
        .object({
          code: z.string().optional(),
          product_name: z.string().optional(),
          brands: z.string().optional(),
          image_front_small_url: z.string().optional(),
          image_front_url: z.string().optional(),
          image_url: z.string().optional(),
          nutriments: z.record(z.string(), z.unknown()).optional(),
        })
        .passthrough(),
    )
    .optional(),
});

const openFoodFactsProductResponseSchema = z.object({
  status: z.number().optional(),
  product: z
    .object({
      code: z.string().optional(),
      product_name: z.string().optional(),
      brands: z.string().optional(),
      image_front_small_url: z.string().optional(),
      image_front_url: z.string().optional(),
      image_url: z.string().optional(),
      nutriments: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

function getNutritionValue(
  nutriments: Record<string, unknown>,
  key: string,
): number | null {
  const value = nutriments[key];
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

function toSearchResult(product: {
  code?: string;
  product_name?: string;
  brands?: string;
  image_front_small_url?: string;
  image_front_url?: string;
  image_url?: string;
  nutriments?: Record<string, unknown>;
}): FoodSearchResult | null {
  const name = product.product_name?.trim();
  const nutriments = product.nutriments;

  if (!name || !nutriments) {
    return null;
  }

  const calories = getNutritionValue(nutriments, "energy-kcal_100g");
  const protein = getNutritionValue(nutriments, "proteins_100g");
  const carbs = getNutritionValue(nutriments, "carbohydrates_100g");
  const fat = getNutritionValue(nutriments, "fat_100g");

  if (calories === null || protein === null || carbs === null || fat === null) {
    return null;
  }

  const result = foodSearchResultSchema.safeParse({
    code: product.code?.trim() || name.slice(0, 32),
    name: name.slice(0, 200),
    brand: product.brands?.trim().slice(0, 120) ?? "",
    image_url: getProductImageUrl(product),
    calories_per_100g: calories,
    protein_per_100g: protein,
    carbs_per_100g: carbs,
    fat_per_100g: fat,
  });

  return result.success ? result.data : null;
}

function getProductImageUrl(product: {
  image_front_small_url?: string;
  image_front_url?: string;
  image_url?: string;
}): string | null {
  for (const candidate of [
    product.image_front_small_url,
    product.image_front_url,
    product.image_url,
  ]) {
    if (!candidate) {
      continue;
    }

    try {
      const url = new URL(candidate);
      if (
        url.protocol === "https:" &&
        url.hostname === "images.openfoodfacts.org"
      ) {
        return url.toString();
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function fetchOpenFoodFactsJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      "La recherche alimentaire est temporairement indisponible.",
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error(
      "Les résultats alimentaires sont momentanément illisibles.",
    );
  }
}

export async function searchOpenFoodFacts(
  query: string,
): Promise<FoodSearchResult[]> {
  const term = query.trim();
  if (/^\d{8,14}$/.test(term)) {
    const productUrl = new URL(
      `https://world.openfoodfacts.org/api/v2/product/${term}.json`,
    );
    productUrl.searchParams.set(
      "fields",
      "code,status,product_name,brands,nutriments,image_url,image_front_url,image_front_small_url",
    );
    const payload = await fetchOpenFoodFactsJson(productUrl);
    const parsedProduct = openFoodFactsProductResponseSchema.safeParse(payload);

    if (!parsedProduct.success) {
      throw new Error("La réponse du produit est invalide.");
    }
    if (parsedProduct.data.status !== 1 || !parsedProduct.data.product) {
      return [];
    }

    const result = toSearchResult(parsedProduct.data.product);
    return result ? [result] : [];
  }

  const searchUrl = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  searchUrl.searchParams.set("search_terms", term);
  searchUrl.searchParams.set("search_simple", "1");
  searchUrl.searchParams.set("action", "process");
  searchUrl.searchParams.set("json", "1");
  searchUrl.searchParams.set("page_size", "10");
  searchUrl.searchParams.set(
    "fields",
    "code,product_name,brands,nutriments,image_url,image_front_url,image_front_small_url",
  );
  searchUrl.searchParams.set("lc", "fr");
  searchUrl.searchParams.set("cc", "fr");
  searchUrl.searchParams.set("nutrition_data", "on");

  const payload = await fetchOpenFoodFactsJson(searchUrl);

  const parsedPayload = openFoodFactsResponseSchema.safeParse(payload);
  if (!parsedPayload.success) {
    throw new Error("Les résultats alimentaires ont un format inattendu.");
  }

  return (parsedPayload.data.products ?? [])
    .map(toSearchResult)
    .filter((result): result is FoodSearchResult => result !== null)
    .slice(0, 10);
}
