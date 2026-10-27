import { NextResponse, type NextRequest } from "next/server";

import { AIConfigurationError, createAIProvider } from "@/services/ai/index";
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
    return NextResponse.json(
      {
        error:
          error instanceof AIConfigurationError
            ? "Le service d’analyse nutritionnelle n’est pas configuré."
            : "L’analyse a échoué. Vérifiez la description puis réessayez.",
      },
      { status: error instanceof AIConfigurationError ? 503 : 502 },
    );
  }
}
