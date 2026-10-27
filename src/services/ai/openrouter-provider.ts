import {
  AIConfigurationError,
  AIProviderRequestError,
} from "@/services/ai/errors";
import {
  extractOpenRouterText,
  parseMealAnalysis,
} from "@/services/ai/response";
import {
  mealImageSchema,
  mealTextSchema,
  type MealAnalysis,
  type MealImageInput,
} from "@/services/ai/schema";
import { MEAL_ANALYSIS_PROMPT, mealTextPrompt } from "@/services/ai/prompts";
import type { AIProvider } from "@/services/ai/provider";

const OPENROUTER_MODEL = "google/gemini-2.0-flash-001";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 30_000;

export class OpenRouterProvider implements AIProvider {
  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new AIConfigurationError("OPENROUTER_API_KEY is not configured.");
    }
  }

  async analyzeMealText(description: string): Promise<MealAnalysis> {
    const validatedDescription = mealTextSchema.parse(description);
    const payload = await this.createCompletion([
      {
        role: "user",
        content: mealTextPrompt(validatedDescription),
      },
    ]);

    return parseMealAnalysis(extractOpenRouterText(payload), "OpenRouter");
  }

  async analyzeMealImage(image: MealImageInput): Promise<MealAnalysis> {
    const validatedImage = mealImageSchema.parse(image);
    const payload = await this.createCompletion([
      {
        role: "user",
        content: [
          { type: "text", text: MEAL_ANALYSIS_PROMPT },
          {
            type: "image_url",
            image_url: {
              url: `data:${validatedImage.mimeType};base64,${validatedImage.base64}`,
            },
          },
        ],
      },
    ]);

    return parseMealAnalysis(extractOpenRouterText(payload), "OpenRouter");
  }

  private async createCompletion(messages: Array<Record<string, unknown>>) {
    let response: Response;

    try {
      response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "Calorie Tracker AI",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
    } catch (error) {
      const message =
        error instanceof Error && error.name === "TimeoutError"
          ? "OpenRouter request timed out."
          : "OpenRouter request could not be completed.";
      throw new AIProviderRequestError("OpenRouter", message);
    }

    if (!response.ok) {
      throw new AIProviderRequestError(
        "OpenRouter",
        `OpenRouter returned HTTP ${response.status}.`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AIProviderRequestError(
        "OpenRouter",
        "OpenRouter returned an unreadable response.",
      );
    }

    return payload;
  }
}
