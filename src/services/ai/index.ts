import { AIConfigurationError } from "@/services/ai/errors";
import { FallbackAIProvider } from "@/services/ai/fallback-provider";
import { GeminiProvider } from "@/services/ai/gemini-provider";
import { OpenRouterProvider } from "@/services/ai/openrouter-provider";
import type { AIProvider } from "@/services/ai/provider";

export type { MealAnalysis, MealImageInput } from "@/services/ai/schema";
export type { AIProvider } from "@/services/ai/provider";
export {
  AIFallbackError,
  AIConfigurationError,
  AIProviderRequestError,
  AIResponseValidationError,
} from "@/services/ai/errors";
export {
  mealAnalysisSchema,
  mealImageSchema,
  mealTextSchema,
} from "@/services/ai/schema";

export function createAIProvider(): AIProvider {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!geminiApiKey && !openRouterApiKey) {
    throw new AIConfigurationError(
      "Configure GEMINI_API_KEY or OPENROUTER_API_KEY to enable meal analysis.",
    );
  }

  const primary = geminiApiKey
    ? new GeminiProvider(geminiApiKey)
    : new OpenRouterProvider(openRouterApiKey ?? "");
  const fallback =
    geminiApiKey && openRouterApiKey
      ? new OpenRouterProvider(openRouterApiKey)
      : null;

  return new FallbackAIProvider(primary, fallback);
}
