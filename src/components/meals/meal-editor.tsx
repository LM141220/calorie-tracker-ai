"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Profiler,
  type ProfilerOnRenderCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search } from "lucide-react";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { saveMealAction } from "@/features/meals/actions";
import { type PortionBaseline } from "@/features/meals/portion-scaling";
import { MealItemList } from "@/components/meals/meal-item-list";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { mealAnalysisSchema } from "@/services/ai/schema";
import type { FoodSearchResult } from "@/validators/foods";
import { saveMealInputSchema, type SaveMealInput } from "@/validators/meals";
import { usePerformanceMount } from "@/lib/performance/client";

const PhotoEntryPanel = dynamic(
  () =>
    import("@/components/meals/meal-entry-panels").then(
      (module) => module.PhotoEntryPanel,
    ),
  {
    loading: () => <div className="h-48 animate-pulse rounded-2xl bg-muted" />,
  },
);
const TextEntryPanel = dynamic(
  () =>
    import("@/components/meals/meal-entry-panels").then(
      (module) => module.TextEntryPanel,
    ),
  {
    loading: () => <div className="h-36 animate-pulse rounded-2xl bg-muted" />,
  },
);
const FoodSearchPanel = dynamic(
  () => import("@/components/meals/food-search-panel"),
  {
    loading: () => <div className="h-56 animate-pulse rounded-2xl bg-muted" />,
  },
);
const MealSummary = dynamic(() =>
  import("@/components/meals/meal-summary").then(
    (module) => module.MealSummary,
  ),
);

const IMAGE_BUCKET = "meal-images";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const apiErrorSchema = z.object({ error: z.string().optional() });

export type MealEditorProps = {
  mode?: "create" | "edit" | "reuse";
  initialEntry?: "photo" | "text" | "search";
  sourceMealId?: string;
  sourceFavoriteId?: string;
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

export function MealEditor({ ...props }: MealEditorProps) {
  usePerformanceMount("MealEditor");
  const renderCommitCount = useRef(0);
  const onRender: ProfilerOnRenderCallback = (
    _id,
    phase,
    actualDuration,
    baseDuration,
  ) => {
    renderCommitCount.current += 1;
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[PERF REACT] MealEditor commit #${renderCommitCount.current} (${phase}): actual ${actualDuration.toFixed(1)}ms, base ${baseDuration.toFixed(1)}ms`,
      );
    }
  };

  return (
    <Profiler id="MealEditor" onRender={onRender}>
      <MealEditorContent {...props} />
    </Profiler>
  );
}

function MealEditorContent({
  mode,
  initialEntry,
  sourceMealId,
  sourceFavoriteId,
  initialMeal,
}: MealEditorProps) {
  const queryClient = useQueryClient();
  const editorMode = mode ?? (initialMeal ? "edit" : "create");
  const isEditing = editorMode === "edit";
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [activeEntry, setActiveEntry] = useState<"photo" | "text" | "search">(
    initialEntry ?? "photo",
  );
  const [isFoodSearchOpen, setIsFoodSearchOpen] = useState(
    initialEntry === "search",
  );
  const [hasOpenedFoodSearch, setHasOpenedFoodSearch] = useState(
    initialEntry === "search",
  );
  const [hasOpenedTextEntry, setHasOpenedTextEntry] = useState(
    initialEntry === "text",
  );
  const [isSaving, startSaving] = useTransition();

  const form = useForm<SaveMealInput>({
    resolver: zodResolver(saveMealInputSchema),
    defaultValues: {
      id: isEditing ? (initialMeal?.id ?? null) : null,
      source_meal_id: editorMode === "reuse" ? (sourceMealId ?? null) : null,
      source_favorite_id:
        editorMode === "reuse" ? (sourceFavoriteId ?? null) : null,
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
  const portionBaselines = useRef<Record<string, PortionBaseline>>({});
  useEffect(() => {
    for (const [index, field] of fields.entries()) {
      const currentItem = form.getValues(`items.${index}`);
      if (currentItem) {
        portionBaselines.current[field.fieldKey] = {
          weight_g: currentItem.weight_g,
          calories: currentItem.calories,
          protein: currentItem.protein,
          carbs: currentItem.carbs,
          fat: currentItem.fat,
        };
      }
    }
  }, [fields, form]);

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

  async function analyzeText(description: string) {
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
        await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        router.push(`/meal/${result.mealId}`);
        router.refresh();
      }
    });
  }

  function addFoodSearchResult(food: FoodSearchResult) {
    append({
      food_name: food.name,
      weight_g: 100,
      calories: food.calories_per_100g,
      protein: food.protein_per_100g,
      carbs: food.carbs_per_100g,
      fat: food.fat_per_100g,
    });
    setIsFoodSearchOpen(false);
    setNotice(
      `${food.name} ajouté avec des valeurs nutritionnelles pour 100 g. Vous pouvez ajuster la portion.`,
    );
    setNoticeIsError(false);
  }

  return (
    <div className="space-y-6">
      {!initialMeal ? (
        <div className="flex flex-wrap gap-2" aria-label="Méthode d’ajout">
          <Button
            onClick={() => {
              setActiveEntry("photo");
              setIsFoodSearchOpen(false);
            }}
            type="button"
            variant={activeEntry === "photo" ? "default" : "outline"}
          >
            Photo
          </Button>
          <Button
            onClick={() => {
              setActiveEntry("text");
              setIsFoodSearchOpen(false);
              setHasOpenedTextEntry(true);
            }}
            type="button"
            variant={activeEntry === "text" ? "default" : "outline"}
          >
            Texte
          </Button>
          <Button
            onClick={() => {
              setActiveEntry("search");
              setIsFoodSearchOpen(true);
              setHasOpenedFoodSearch(true);
            }}
            type="button"
            variant={activeEntry === "search" ? "default" : "outline"}
          >
            <Search aria-hidden="true" className="mr-2 size-4" />
            Aliment
          </Button>
        </div>
      ) : null}

      {initialMeal || activeEntry === "photo" ? (
        <PhotoEntryPanel
          inputRef={fileInputRef}
          initialMeal={Boolean(initialMeal)}
          isAnalyzing={isAnalyzing}
          onAnalyzeAgain={() => {
            if (uploadedPath) {
              void analyzeImagePath(uploadedPath);
            }
          }}
          onImageSelected={(file) => void onImageSelected(file)}
          onRemoveImage={() => {
            setPreviewUrl(null);
            setUploadedPath(null);
            setIsImageAnalysisPending(false);
            form.setValue("image_path", null, { shouldValidate: true });
          }}
          previewUrl={previewUrl}
          uploadedPath={uploadedPath}
        />
      ) : null}

      {!initialMeal && hasOpenedTextEntry ? (
        <div hidden={activeEntry !== "text"}>
          <TextEntryPanel
            isAnalyzing={isAnalyzing}
            onAnalyze={(description) => void analyzeText(description)}
          />
        </div>
      ) : null}

      {editorMode === "reuse" ? (
        <p className="rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">
          Ajuste les portions et les valeurs si besoin. Une nouvelle entrée sera
          ajoutée à aujourd’hui, sans modifier le repas d’origine.
        </p>
      ) : null}

      {notice ? (
        <p
          className={`rounded-2xl p-4 text-sm ${noticeIsError ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground"}`}
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
        <section className="soft-panel space-y-4 p-5 sm:p-6">
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
              className="h-12 w-full rounded-xl border-0 bg-background px-4 text-base shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="min-h-20 w-full rounded-xl border-0 bg-background p-4 text-base shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              id="meal-notes"
              maxLength={5000}
              {...form.register("notes")}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">Aliments</h3>
            <MealSummary control={form.control} />
          </div>

          <MealItemList
            fields={fields}
            form={form}
            onRemove={remove}
            portionBaselines={portionBaselines}
          />

          {hasOpenedFoodSearch ? (
            <div hidden={!isFoodSearchOpen}>
              <FoodSearchPanel
                isOpen={isFoodSearchOpen}
                itemCount={fields.length}
                onAddFood={addFoodSearchResult}
                onClose={() => setIsFoodSearchOpen(false)}
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              className="gap-2"
              disabled={fields.length >= 50}
              onClick={() => {
                const opening = !isFoodSearchOpen;
                setIsFoodSearchOpen(opening);
                if (opening) {
                  setHasOpenedFoodSearch(true);
                }
                setActiveEntry("search");
              }}
              type="button"
              variant="outline"
            >
              <Search aria-hidden="true" className="size-4" />
              Rechercher un aliment
            </Button>
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
              variant="ghost"
            >
              <Plus aria-hidden="true" className="size-4" />
              Saisie manuelle
            </Button>
          </div>
        </section>

        <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={
              isEditing
                ? `/meal/${initialMeal?.id}`
                : editorMode === "reuse"
                  ? "/meal/new"
                  : "/dashboard"
            }
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
              : isEditing
                ? "Enregistrer les modifications"
                : editorMode === "reuse"
                  ? "Ajouter à aujourd’hui"
                  : "Enregistrer le repas"}
          </Button>
        </div>
      </form>
    </div>
  );
}
