import { AIFallbackError, normalizeAIError } from "@/services/ai/errors";
import type { AIProvider } from "@/services/ai/provider";
import {
  mealImageSchema,
  mealTextSchema,
  type MealAnalysis,
  type MealImageInput,
} from "@/services/ai/schema";

export class FallbackAIProvider implements AIProvider {
  constructor(
    private readonly primary: AIProvider,
    private readonly fallback: AIProvider | null,
  ) {}

  async analyzeMealImage(image: MealImageInput): Promise<MealAnalysis> {
    const validatedImage = mealImageSchema.parse(image);
    return this.runWithFallback(
      () => this.primary.analyzeMealImage(validatedImage),
      () => this.fallback?.analyzeMealImage(validatedImage),
    );
  }

  async analyzeMealText(description: string): Promise<MealAnalysis> {
    const validatedDescription = mealTextSchema.parse(description);
    return this.runWithFallback(
      () => this.primary.analyzeMealText(validatedDescription),
      () => this.fallback?.analyzeMealText(validatedDescription),
    );
  }

  private async runWithFallback(
    runPrimary: () => Promise<MealAnalysis>,
    runFallback: () => Promise<MealAnalysis> | undefined,
  ): Promise<MealAnalysis> {
    try {
      return await runPrimary();
    } catch (primaryError: unknown) {
      const normalizedPrimaryError = normalizeAIError(primaryError);
      const fallbackOperation = runFallback();

      if (!fallbackOperation) {
        throw normalizedPrimaryError;
      }

      try {
        return await fallbackOperation;
      } catch (fallbackError: unknown) {
        throw new AIFallbackError(
          normalizedPrimaryError,
          normalizeAIError(fallbackError),
        );
      }
    }
  }
}
