import { z } from "zod";

const boundedNutritionValue = z.number().finite().min(0);

export const mealItemInputSchema = z
  .object({
    food_name: z.string().trim().min(1).max(200),
    weight_g: boundedNutritionValue.max(100_000),
    calories: boundedNutritionValue.max(1_000_000),
    protein: boundedNutritionValue.max(100_000),
    carbs: boundedNutritionValue.max(100_000),
    fat: boundedNutritionValue.max(100_000),
  })
  .strict();

export const saveMealInputSchema = z
  .object({
    id: z.string().uuid().nullable().optional(),
    meal_name: z.string().trim().min(1).max(200),
    notes: z.string().max(5000).nullable(),
    image_path: z
      .string()
      .regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i,
      )
      .nullable(),
    items: z.array(mealItemInputSchema).min(1).max(50),
  })
  .strict();

export const analyzeTextInputSchema = z
  .object({
    description: z.string().trim().min(3).max(5000),
  })
  .strict();

export const imagePathInputSchema = z
  .object({
    imagePath: saveMealInputSchema.shape.image_path.unwrap(),
  })
  .strict();

export type SaveMealInput = z.infer<typeof saveMealInputSchema>;
