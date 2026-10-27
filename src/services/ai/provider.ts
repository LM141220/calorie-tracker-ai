import type { MealAnalysis, MealImageInput } from "@/services/ai/schema";

export interface AIProvider {
  analyzeMealImage(image: MealImageInput): Promise<MealAnalysis>;
  analyzeMealText(description: string): Promise<MealAnalysis>;
}
