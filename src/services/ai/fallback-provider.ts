import { AIFallbackError, normalizeAIError } from "@/services/ai/errors";
import type { AIProvider } from "@/services/ai/provider";
import type { MealAnalysis, MealImageInput } from "@/services/ai/schema";

export class FallbackAIProvider implements AIProvider {
  constructor(
    private readonly primary: AIProvider,
    private readonly fallback: AIProvider | null,
  ) {}

  async analyzeMealImage(image: MealImageInput): Promise<MealAnalysis> {
    return this.runWithFallback(
      () => this.primary.analyzeMealImage(image),
      () => this.fallback?.analyzeMealImage(image),
    );
  }

  async analyzeMealText(description: string): Promise<MealAnalysis> {
    return this.runWithFallback(
      () => this.primary.analyzeMealText(description),
      () => this.fallback?.analyzeMealText(description),
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
