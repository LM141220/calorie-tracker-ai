import { z } from "zod";

import { AIResponseValidationError } from "@/services/ai/errors";
import { mealAnalysisSchema, type MealAnalysis } from "@/services/ai/schema";

const geminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(z.object({ text: z.string().optional() })),
        }),
      }),
    )
    .min(1),
});

const openRouterResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      }),
    )
    .min(1),
});

export function parseMealAnalysis(
  responseText: string,
  providerName: string,
): MealAnalysis {
  let payload: unknown;

  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new AIResponseValidationError(
      providerName,
      "The provider response was not valid JSON.",
    );
  }

  const parsed = mealAnalysisSchema.safeParse(payload);
  if (!parsed.success) {
    const issueSummary = parsed.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join(".") || "response"}: ${issue.message}`)
      .join("; ");
    throw new AIResponseValidationError(
      providerName,
      `The provider response did not match the nutrition schema: ${issueSummary}`,
    );
  }

  return parsed.data;
}

export function extractGeminiText(payload: unknown): string {
  const parsed = geminiResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AIResponseValidationError(
      "Gemini",
      "Gemini returned an unexpected response structure.",
    );
  }

  const text = parsed.data.candidates[0]?.content.parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new AIResponseValidationError(
      "Gemini",
      "Gemini returned an empty analysis.",
    );
  }

  return text;
}

export function extractOpenRouterText(payload: unknown): string {
  const parsed = openRouterResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new AIResponseValidationError(
      "OpenRouter",
      "OpenRouter returned an unexpected response structure.",
    );
  }

  const text = parsed.data.choices[0]?.message.content.trim();
  if (!text) {
    throw new AIResponseValidationError(
      "OpenRouter",
      "OpenRouter returned an empty analysis.",
    );
  }

  return text;
}
