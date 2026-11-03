import { NextResponse, type NextRequest } from "next/server";

import {
  AIConfigurationError,
  AIProviderRequestError,
  AIResponseValidationError,
  createAIProvider,
} from "@/services/ai/index";
import { analyzeTextInputSchema } from "@/validators/meals";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Requête JSON invalide." },
      { status: 400 },
    );
  }

  const parsed = analyzeTextInputSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Description invalide." },
      { status: 400 },
    );
  }

  try {
    const analysis = await createAIProvider().analyzeMealText(
      parsed.data.description,
    );
    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error("Meal text analysis failed.", error);
    if (
      error instanceof AIProviderRequestError &&
      error.responseBody !== undefined
    ) {
      console.error("Gemini error response body:", error.responseBody);
    }

    const isTemporaryGeminiOutage =
      error instanceof AIProviderRequestError &&
      error.provider === "Gemini" &&
      error.statusCode === 503;
    const isResponseValidationError =
      error instanceof AIResponseValidationError;
    const isNetworkError =
      error instanceof AIProviderRequestError &&
      (error.kind === "network" || error.kind === "timeout");

    return NextResponse.json(
      {
        error:
          error instanceof AIConfigurationError
            ? "Le service d’analyse nutritionnelle n’est pas configuré."
            : isTemporaryGeminiOutage
              ? "Le service d'analyse est temporairement indisponible. Réessayez dans quelques instants."
              : isResponseValidationError
                ? "Le service d’analyse a renvoyé une réponse invalide."
                : isNetworkError
                  ? "Impossible de joindre le service d’analyse. Réessayez."
                  : "L’analyse a échoué. Vérifiez la description puis réessayez.",
      },
      {
        status:
          error instanceof AIConfigurationError || isTemporaryGeminiOutage
            ? 503
            : 502,
      },
    );
  }
}
