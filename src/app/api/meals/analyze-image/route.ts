import { NextResponse, type NextRequest } from "next/server";

import { AIConfigurationError, createAIProvider } from "@/services/ai/index";
import { imagePathInputSchema } from "@/validators/meals";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_BUCKET = "meal-images";

type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp";

function detectImageMime(bytes: Uint8Array): SupportedImageMime | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

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

  const parsed = imagePathInputSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Chemin d’image invalide." },
      { status: 400 },
    );
  }

  const [ownerId] = parsed.data.imagePath.split("/");
  if (ownerId !== user.id) {
    return NextResponse.json({ error: "Image inaccessible." }, { status: 403 });
  }

  const { data: image, error: downloadError } = await supabase.storage
    .from(IMAGE_BUCKET)
    .download(parsed.data.imagePath);

  if (downloadError || !image) {
    console.error("Meal image download failed.", downloadError);
    return NextResponse.json(
      { error: "Impossible de récupérer l’image téléversée." },
      { status: 422 },
    );
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "L’image ne peut pas dépasser 10 Mo." },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  const mimeType = detectImageMime(bytes);
  if (!mimeType) {
    return NextResponse.json(
      {
        error:
          "Le fichier ne semble pas être une image JPEG, PNG ou WebP valide.",
      },
      { status: 415 },
    );
  }

  try {
    const analysis = await createAIProvider().analyzeMealImage({
      mimeType,
      base64: Buffer.from(bytes).toString("base64"),
    });

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    console.error("Meal image analysis failed.", error);
    return NextResponse.json(
      {
        error:
          error instanceof AIConfigurationError
            ? "Le service d’analyse nutritionnelle n’est pas configuré."
            : "L’analyse de l’image a échoué. Réessayez.",
      },
      { status: error instanceof AIConfigurationError ? 503 : 502 },
    );
  }
}
