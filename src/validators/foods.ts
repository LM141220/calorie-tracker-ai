import { z } from "zod";

export const foodSearchResultSchema = z
  .object({
    code: z.string().trim().max(32).optional(),
    name: z.string().trim().min(1).max(200),
    brand: z.string().trim().max(120),
    image_url: z.string().url().nullable(),
    calories_per_100g: z.number().finite().min(0).max(1_000_000),
    protein_per_100g: z.number().finite().min(0).max(100_000),
    carbs_per_100g: z.number().finite().min(0).max(100_000),
    fat_per_100g: z.number().finite().min(0).max(100_000),
  })
  .strict();

export type FoodSearchResult = z.infer<typeof foodSearchResultSchema>;
