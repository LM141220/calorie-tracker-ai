import {
  AIConfigurationError,
  AIProviderRequestError,
} from "@/services/ai/errors";
import { extractGeminiText, parseMealAnalysis } from "@/services/ai/response";
import {
  mealImageSchema,
  mealTextSchema,
  type MealAnalysis,
  type MealImageInput,
} from "@/services/ai/schema";
import { MEAL_ANALYSIS_PROMPT, mealTextPrompt } from "@/services/ai/prompts";
import type { AIProvider } from "@/services/ai/provider";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 30_000;

export class GeminiProvider implements AIProvider {
  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new AIConfigurationError("GEMINI_API_KEY is not configured.");
    }
  }

  async analyzeMealText(description: string): Promise<MealAnalysis> {
    const validatedDescription = mealTextSchema.parse(description);
    const payload = await this.generateContent([
      { text: mealTextPrompt(validatedDescription) },
    ]);

    return parseMealAnalysis(extractGeminiText(payload), "Gemini");
  }

  async analyzeMealImage(image: MealImageInput): Promise<MealAnalysis> {
    const validatedImage = mealImageSchema.parse(image);
    const payload = await this.generateContent([
      { text: MEAL_ANALYSIS_PROMPT },
      {
        inline_data: {
          mime_type: validatedImage.mimeType,
          data: validatedImage.base64,
        },
      },
    ]);

    return parseMealAnalysis(extractGeminiText(payload), "Gemini");
  }

  private async generateContent(parts: Array<Record<string, unknown>>) {
    let response: Response;

    try {
      response = await fetch(
        `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          cache: "no-store",
        },
      );
    } catch (error) {
      const message =
        error instanceof Error && error.name === "TimeoutError"
          ? "Gemini request timed out."
          : "Gemini request could not be completed.";
      throw new AIProviderRequestError("Gemini", message);
    }

    if (!response.ok) {
      throw new AIProviderRequestError(
        "Gemini",
        `Gemini returned HTTP ${response.status}.`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AIProviderRequestError(
        "Gemini",
        "Gemini returned an unreadable response.",
      );
    }

    return payload;
  }
}
