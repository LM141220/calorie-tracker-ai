import { z } from "zod";

const nutritionValueSchema = z.number().finite().min(0).max(1_000_000);

export const mealAnalysisSchema = z
  .object({
    foods: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(200),
            estimated_weight_g: z.number().finite().min(0).max(100_000),
            calories: nutritionValueSchema,
            protein: nutritionValueSchema,
            carbs: nutritionValueSchema,
            fat: nutritionValueSchema,
          })
          .strict(),
      )
      .min(1)
      .max(50),
    total_calories: nutritionValueSchema,
    total_protein: nutritionValueSchema,
    total_carbs: nutritionValueSchema,
    total_fat: nutritionValueSchema,
    confidence: z.number().finite().min(0).max(1),
  })
  .strict();

export const mealImageSchema = z
  .object({
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    base64: z
      .string()
      .min(4)
      .max(14_000_000)
      .regex(
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
      ),
  })
  .superRefine((image, context) => {
    const paddingLength = image.base64.endsWith("==")
      ? 2
      : image.base64.endsWith("=")
        ? 1
        : 0;
    const decodedLength = (image.base64.length * 3) / 4 - paddingLength;

    if (decodedLength > 10 * 1024 * 1024) {
      context.addIssue({
        code: "custom",
        message: "L’image ne peut pas dépasser 10 Mo.",
        path: ["base64"],
      });
    }
  });

export const mealTextSchema = z
  .string()
  .trim()
  .min(3, "Décrivez le repas en quelques mots.")
  .max(5_000, "La description ne peut pas dépasser 5 000 caractères.");

export type MealAnalysis = z.infer<typeof mealAnalysisSchema>;
export type MealImageInput = z.infer<typeof mealImageSchema>;
