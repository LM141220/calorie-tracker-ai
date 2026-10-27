"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, FileText, Plus, Trash2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { saveMealAction } from "@/features/meals/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { mealAnalysisSchema } from "@/services/ai/schema";
import { saveMealInputSchema, type SaveMealInput } from "@/validators/meals";

const IMAGE_BUCKET = "meal-images";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const apiErrorSchema = z.object({ error: z.string().optional() });

type MealEditorProps = {
  initialMeal?: {
    id: string;
    mealName: string;
    notes: string | null;
    imagePath: string | null;
    imagePreviewUrl: string | null;
    items: SaveMealInput["items"];
  };
};

function getImageExtension(mimeType: (typeof allowedMimeTypes)[number]) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
  }
}

function isSupportedImageMime(
  mimeType: string,
): mimeType is (typeof allowedMimeTypes)[number] {
  return allowedMimeTypes.some(
    (supportedMimeType) => supportedMimeType === mimeType,
  );
}

async function getApiError(response: Response): Promise<string> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return "La requête a échoué. Réessayez.";
  }

  const parsed = apiErrorSchema.safeParse(payload);
  return parsed.success && parsed.data.error
    ? parsed.data.error
    : "La requête a échoué. Réessayez.";
}

export function MealEditor({ initialMeal }: MealEditorProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"photo" | "text">("photo");
  const [description, setDescription] = useState("");
  const [previewUrl, setPreviewUrl] = useState(
    initialMeal?.imagePreviewUrl ?? null,
  );
  const [uploadedPath, setUploadedPath] = useState<string | null>(
    initialMeal?.imagePath ?? null,
  );
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImageAnalysisPending, setIsImageAnalysisPending] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const form = useForm<SaveMealInput>({
    resolver: zodResolver(saveMealInputSchema),
    defaultValues: {
      id: initialMeal?.id ?? null,
      meal_name: initialMeal?.mealName ?? "",
      notes: initialMeal?.notes ?? "",
      image_path: initialMeal?.imagePath ?? null,
      items: initialMeal?.items ?? [],
    },
  });
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
    keyName: "fieldKey",
  });
  const items = form.watch("items");
  const totalCalories = items.reduce(
    (total, item) => total + (item.calories || 0),
    0,
  );

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function analyzeImagePath(imagePath: string) {
    setNotice("");
    setIsAnalyzing(true);
    setIsImageAnalysisPending(true);

    try {
      const response = await fetch("/api/meals/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath }),
      });

      if (!response.ok) {
        throw new Error(await getApiError(response));
      }

      const payload: unknown = await response.json();
      const analysis = mealAnalysisSchema.parse(payload);
      replace(
        analysis.foods.map((food) => ({
          food_name: food.name,
          weight_g: food.estimated_weight_g,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        })),
      );
      if (!form.getValues("meal_name").trim()) {
        form.setValue(
          "meal_name",
          analysis.foods
            .map((food) => food.name)
            .join(", ")
            .slice(0, 200),
        );
      }
      setNotice(
        `Analyse terminée — confiance estimée : ${Math.round(analysis.confidence * 100)} %. Vérifiez les quantités avant d’enregistrer.`,
      );
      setNoticeIsError(false);
      setIsImageAnalysisPending(false);
    } catch (error: unknown) {
      setNotice(
        error instanceof Error
          ? error.message
          : "L’analyse de l’image a échoué.",
      );
      setNoticeIsError(true);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function onImageSelected(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!isSupportedImageMime(file.type)) {
      setNotice("Choisissez une image JPEG, PNG ou WebP.");
      setNoticeIsError(true);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setNotice("L’image ne peut pas dépasser 10 Mo.");
      setNoticeIsError(true);
      return;
    }

    setNotice("");
    const localPreviewUrl = URL.createObjectURL(file);
    let keepPreview = false;

    try {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Votre session a expiré. Reconnectez-vous.");
      }

      const extension = getImageExtension(file.type);
      const imagePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(imagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error("Le téléversement a échoué. Réessayez.");
      }

      const previousUploadedPath = uploadedPath;
      setUploadedPath(imagePath);
      setPreviewUrl(localPreviewUrl);
      keepPreview = true;
      form.setValue("image_path", imagePath, { shouldValidate: true });

      if (
        previousUploadedPath &&
        previousUploadedPath !== initialMeal?.imagePath
      ) {
        const { error: cleanupError } = await supabase.storage
          .from(IMAGE_BUCKET)
          .remove([previousUploadedPath]);
        if (cleanupError) {
          console.error("Temporary meal image cleanup failed.", cleanupError);
        }
      }

      await analyzeImagePath(imagePath);
    } catch (error: unknown) {
      setNotice(
        error instanceof Error ? error.message : "Le téléversement a échoué.",
      );
      setNoticeIsError(true);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (!keepPreview) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    }
  }

  async function analyzeText() {
    setNotice("");
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/meals/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        throw new Error(await getApiError(response));
      }

      const payload: unknown = await response.json();
      const analysis = mealAnalysisSchema.parse(payload);
      replace(
        analysis.foods.map((food) => ({
          food_name: food.name,
          weight_g: food.estimated_weight_g,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        })),
      );
      if (!form.getValues("meal_name").trim()) {
        form.setValue(
          "meal_name",
          analysis.foods
            .map((food) => food.name)
            .join(", ")
            .slice(0, 200),
        );
      }
      form.setValue("notes", description, { shouldValidate: true });
      setNotice(
        `Analyse terminée — confiance estimée : ${Math.round(analysis.confidence * 100)} %. Vérifiez les valeurs avant d’enregistrer.`,
      );
      setNoticeIsError(false);
    } catch (error: unknown) {
      setNotice(
        error instanceof Error ? error.message : "L’analyse du texte a échoué.",
      );
      setNoticeIsError(true);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function onSubmit(values: SaveMealInput) {
    if (isImageAnalysisPending) {
      setNotice("Terminez l’analyse de la nouvelle photo avant d’enregistrer.");
      setNoticeIsError(true);
      return;
    }

    setNotice("");
    startSaving(async () => {
      const result = await saveMealAction(values);
      setNotice(result.message);
      setNoticeIsError(!result.success);

      if (result.success && result.mealId) {
        router.push(`/meal/${result.mealId}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {!initialMeal ? (
        <div
          className="grid grid-cols-2 rounded-xl bg-muted p-1"
          aria-label="Mode d’ajout du repas"
          role="group"
        >
          <button
            aria-pressed={mode === "photo"}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition ${mode === "photo" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setMode("photo")}
            type="button"
          >
            <Camera aria-hidden="true" className="size-4" />
            Photo
          </button>
          <button
            aria-pressed={mode === "text"}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition ${mode === "text" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setMode("text")}
            type="button"
          >
            <FileText aria-hidden="true" className="size-4" />
            Texte
          </button>
        </div>
      ) : null}

      {!initialMeal && mode === "photo" ? (
        <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
          <div>
            <h2 className="font-semibold">Ajouter une photo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              JPEG, PNG ou WebP — 10 Mo maximum. La photo est stockée dans votre
              espace privé.
            </p>
          </div>
          {previewUrl ? (
            <div className="relative aspect-[4/3] max-h-80 overflow-hidden rounded-xl bg-muted">
              <Image
                alt="Aperçu du repas sélectionné"
                className="object-contain"
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, 600px"
                src={previewUrl}
              />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              variant="outline"
            >
              <Camera aria-hidden="true" className="mr-2 size-4" />
              {previewUrl
                ? "Choisir une autre photo"
                : "Prendre ou choisir une photo"}
            </Button>
            {uploadedPath ? (
              <Button
                disabled={isAnalyzing}
                onClick={() => void analyzeImagePath(uploadedPath)}
                type="button"
                variant="secondary"
              >
                {isAnalyzing ? "Analyse…" : "Relancer l’analyse"}
              </Button>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            accept={allowedMimeTypes.join(",")}
            aria-label="Choisir une photo du repas"
            capture="environment"
            className="sr-only"
            onChange={(event) => void onImageSelected(event.target.files?.[0])}
            type="file"
          />
        </section>
      ) : null}

      {!initialMeal && mode === "text" ? (
        <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
          <div>
            <h2 className="font-semibold">Décrire le repas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Indiquez les aliments et, si possible, les quantités.
            </p>
          </div>
          <label className="sr-only" htmlFor="meal-description">
            Description du repas
          </label>
          <textarea
            className="min-h-32 w-full resize-y rounded-lg border bg-background p-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            id="meal-description"
            maxLength={5000}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Ex. : 150 g de riz, 200 g de poulet et une pomme"
            value={description}
          />
          <Button
            disabled={isAnalyzing || description.trim().length < 3}
            onClick={() => void analyzeText()}
            type="button"
          >
            {isAnalyzing ? "Analyse en cours…" : "Analyser le repas"}
          </Button>
        </section>
      ) : null}

      {initialMeal ? (
        <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
          <div>
            <h2 className="font-semibold">Photo du repas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vous pouvez conserver, remplacer ou retirer la photo.
            </p>
          </div>
          {previewUrl ? (
            <div className="relative aspect-[4/3] max-h-80 overflow-hidden rounded-xl bg-muted">
              <Image
                alt="Photo du repas"
                className="object-contain"
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, 600px"
                src={previewUrl}
              />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              variant="outline"
            >
              <Camera aria-hidden="true" className="mr-2 size-4" />
              Remplacer la photo
            </Button>
            {previewUrl ? (
              <Button
                onClick={() => {
                  setPreviewUrl(null);
                  setUploadedPath(null);
                  setIsImageAnalysisPending(false);
                  form.setValue("image_path", null, { shouldValidate: true });
                }}
                type="button"
                variant="ghost"
              >
                Retirer la photo
              </Button>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            accept={allowedMimeTypes.join(",")}
            aria-label="Remplacer la photo du repas"
            capture="environment"
            className="sr-only"
            onChange={(event) => void onImageSelected(event.target.files?.[0])}
            type="file"
          />
        </section>
      ) : null}

      {notice ? (
        <p
          className={`rounded-lg p-3 text-sm ${noticeIsError ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground"}`}
          role={noticeIsError ? "alert" : "status"}
        >
          {notice}
        </p>
      ) : null}

      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
          <div>
            <h2 className="font-semibold">Vérifier et modifier</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Les estimations sont indicatives. Corrigez-les selon votre repas.
            </p>
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="meal-name"
            >
              Nom du repas
            </label>
            <input
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              id="meal-name"
              maxLength={200}
              {...form.register("meal_name")}
              aria-invalid={Boolean(form.formState.errors.meal_name)}
            />
            {form.formState.errors.meal_name ? (
              <p className="mt-1 text-sm text-destructive" role="alert">
                {form.formState.errors.meal_name.message}
              </p>
            ) : null}
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium"
              htmlFor="meal-notes"
            >
              Notes
            </label>
            <textarea
              className="min-h-20 w-full rounded-lg border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              id="meal-notes"
              maxLength={5000}
              {...form.register("notes")}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">Aliments</h3>
            <span className="text-sm text-muted-foreground">
              Total : {Math.round(totalCalories)} kcal
            </span>
          </div>

          {fields.length === 0 ? (
            <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              Analysez une photo ou une description pour commencer, ou ajoutez
              un aliment manuellement.
            </p>
          ) : null}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <fieldset
                className="space-y-3 rounded-xl border p-4"
                key={field.fieldKey}
              >
                <legend className="sr-only">Aliment {index + 1}</legend>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <label
                      className="mb-1 block text-xs text-muted-foreground"
                      htmlFor={`food-name-${index}`}
                    >
                      Aliment
                    </label>
                    <input
                      className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      id={`food-name-${index}`}
                      maxLength={200}
                      {...form.register(`items.${index}.food_name`)}
                    />
                  </div>
                  <Button
                    aria-label={`Supprimer l’aliment ${index + 1}`}
                    className="mt-5 shrink-0"
                    onClick={() => remove(index)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {(
                    [
                      ["weight_g", "Poids (g)", 100_000],
                      ["calories", "Calories", 1_000_000],
                      ["protein", "Protéines (g)", 100_000],
                      ["carbs", "Glucides (g)", 100_000],
                      ["fat", "Lipides (g)", 100_000],
                    ] as const
                  ).map(([key, label, max]) => (
                    <div key={key}>
                      <label
                        className="mb-1 block text-xs text-muted-foreground"
                        htmlFor={`food-${key}-${index}`}
                      >
                        {label}
                      </label>
                      <input
                        className="h-10 w-full rounded-lg border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        id={`food-${key}-${index}`}
                        max={max}
                        min={0}
                        step="any"
                        type="number"
                        {...form.register(`items.${index}.${key}`, {
                          valueAsNumber: true,
                        })}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <Button
            className="gap-2"
            disabled={fields.length >= 50}
            onClick={() =>
              append({
                food_name: "",
                weight_g: 0,
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
              })
            }
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="size-4" />
            Ajouter un aliment
          </Button>
        </section>

        <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={initialMeal ? `/meal/${initialMeal.id}` : "/meal/new"}
          >
            Annuler
          </Link>
          <Button
            disabled={isSaving || isAnalyzing || isImageAnalysisPending}
            type="submit"
            size="lg"
          >
            {isSaving
              ? "Enregistrement…"
              : initialMeal
                ? "Enregistrer les modifications"
                : "Enregistrer le repas"}
          </Button>
        </div>
      </form>
    </div>
  );
}
