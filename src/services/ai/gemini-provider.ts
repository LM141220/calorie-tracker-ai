import "server-only";

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

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_TRANSIENT_RETRIES = 2;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: [
    "foods",
    "total_calories",
    "total_protein",
    "total_carbs",
    "total_fat",
    "confidence",
  ],
  properties: {
    foods: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: [
          "name",
          "estimated_weight_g",
          "calories",
          "protein",
          "carbs",
          "fat",
        ],
        properties: {
          name: { type: "STRING" },
          estimated_weight_g: { type: "NUMBER" },
          calories: { type: "NUMBER" },
          protein: { type: "NUMBER" },
          carbs: { type: "NUMBER" },
          fat: { type: "NUMBER" },
        },
      },
    },
    total_calories: { type: "NUMBER" },
    total_protein: { type: "NUMBER" },
    total_carbs: { type: "NUMBER" },
    total_fat: { type: "NUMBER" },
    confidence: { type: "NUMBER" },
  },
} as const;

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: MealImageInput["mimeType"]; data: string } };

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

  private async generateContent(parts: GeminiPart[]) {
    for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt += 1) {
      let response: Response;

      try {
        response = await fetch(
          `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": this.apiKey,
            },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: GEMINI_RESPONSE_SCHEMA,
                temperature: 0.2,
                maxOutputTokens: 4096,
              },
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            cache: "no-store",
          },
        );
      } catch (error) {
        if (attempt < MAX_TRANSIENT_RETRIES) {
          await new Promise((resolve) =>
            setTimeout(resolve, 500 * 2 ** attempt),
          );
          continue;
        }

        const message =
          error instanceof Error && error.name === "TimeoutError"
            ? "Gemini request timed out."
            : "Gemini request could not be completed.";
        throw new AIProviderRequestError("Gemini", message);
      }

      if (!response.ok) {
        if (
          RETRYABLE_STATUS_CODES.has(response.status) &&
          attempt < MAX_TRANSIENT_RETRIES
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, 500 * 2 ** attempt),
          );
          continue;
        }

        throw new AIProviderRequestError(
          "Gemini",
          `Gemini returned HTTP ${response.status}.`,
        );
      }

      try {
        return await response.json();
      } catch {
        throw new AIProviderRequestError(
          "Gemini",
          "Gemini returned an unreadable response.",
        );
      }
    }

    throw new AIProviderRequestError(
      "Gemini",
      "Gemini request exceeded its retry limit.",
    );
  }
}
