"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, LoaderCircle, Plus, Search, Trash2, X } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { saveMealAction } from "@/features/meals/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { mealAnalysisSchema } from "@/services/ai/schema";
import { searchOpenFoodFacts } from "@/services/foods/open-food-facts";
import type { FoodSearchResult } from "@/validators/foods";
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

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorInstance = {
  detect: (video: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorConstructor = new (options: {
  formats: string[];
}) => BarcodeDetectorInstance;

function getBarcodeDetector(): BarcodeDetectorConstructor | null {
  const browserWindow = window as Window & {
    BarcodeDetector?: BarcodeDetectorConstructor;
  };
  return browserWindow.BarcodeDetector ?? null;
}

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
  const barcodeVideoRef = useRef<HTMLVideoElement>(null);
  const foodSearchRef = useRef<HTMLElement>(null);
  const foodSearchInputRef = useRef<HTMLInputElement>(null);
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
  const [isFoodSearchOpen, setIsFoodSearchOpen] = useState(false);
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [foodSearchResults, setFoodSearchResults] = useState<
    FoodSearchResult[]
  >([]);
  const [foodSearchError, setFoodSearchError] = useState("");
  const [isSearchingFoods, setIsSearchingFoods] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [barcodeScannerError, setBarcodeScannerError] = useState("");
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

  useEffect(() => {
    if (isFoodSearchOpen) {
      foodSearchRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      foodSearchInputRef.current?.focus({ preventScroll: true });
    }
  }, [isFoodSearchOpen]);

  useEffect(() => {
    if (!isBarcodeScannerOpen) {
      return;
    }

    let isActive = true;
    let animationFrame = 0;
    let mediaStream: MediaStream | null = null;
    const videoElement = barcodeVideoRef.current;

    async function startBarcodeScanner() {
      const Detector = getBarcodeDetector();
      if (!Detector || !videoElement || !navigator.mediaDevices?.getUserMedia) {
        setBarcodeScannerError(
          "Le scan par caméra n’est pas pris en charge par ce navigateur. Saisissez le code-barres ou utilisez un lecteur connecté.",
        );
        return;
      }

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (!isActive) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        videoElement.srcObject = mediaStream;
        await videoElement.play();
        const detector = new Detector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e"],
        });

        const scanFrame = async () => {
          if (!isActive) {
            return;
          }

          try {
            const [barcode] = await detector.detect(videoElement);
            if (barcode) {
              const normalizedBarcode = barcode.rawValue.replace(/\D/g, "");
              if (/^\d{8,14}$/.test(normalizedBarcode)) {
                setFoodSearchQuery(normalizedBarcode);
                setBarcodeScannerError("");
                setIsBarcodeScannerOpen(false);
                return;
              }
            }
          } catch (error: unknown) {
            console.error("Barcode scanning failed.", error);
            setBarcodeScannerError(
              "Impossible de lire ce code. Réessayez ou saisissez-le manuellement.",
            );
            setIsBarcodeScannerOpen(false);
            return;
          }

          animationFrame = window.requestAnimationFrame(() => {
            void scanFrame();
          });
        };

        void scanFrame();
      } catch (error: unknown) {
        console.error("Barcode camera could not be started.", error);
        setBarcodeScannerError(
          "Impossible d’accéder à la caméra. Vérifiez son autorisation ou saisissez le code-barres.",
        );
        setIsBarcodeScannerOpen(false);
      }
    }

    void startBarcodeScanner();

    return () => {
      isActive = false;
      window.cancelAnimationFrame(animationFrame);
      mediaStream?.getTracks().forEach((track) => track.stop());
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [isBarcodeScannerOpen]);

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

  async function searchFoods() {
    const query = foodSearchQuery.trim();
    if (query.length < 2) {
      setFoodSearchError("Saisissez au moins 2 caractères.");
      return;
    }

    setIsSearchingFoods(true);
    setFoodSearchError("");
    setFoodSearchResults([]);

    try {
      const results = await searchOpenFoodFacts(query);
      setFoodSearchResults(results);
      if (results.length === 0) {
        setFoodSearchError(
          "Aucun aliment avec des valeurs nutritionnelles complètes trouvé. Essayez un autre terme ou ajoutez-le manuellement.",
        );
      }
    } catch (error: unknown) {
      setFoodSearchError(
        error instanceof Error
          ? error.message
          : "La recherche a échoué. Réessayez.",
      );
    } finally {
      setIsSearchingFoods(false);
    }
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
    setFoodSearchQuery("");
    setFoodSearchResults([]);
    setFoodSearchError("");
    setNotice(
      `${food.name} ajouté avec des valeurs nutritionnelles pour 100 g. Vous pouvez ajuster la portion.`,
    );
    setNoticeIsError(false);
  }

  return (
    <div className="space-y-6">
      {!initialMeal ? (
        <section className="space-y-5">
          <div className="soft-panel space-y-4 p-5 sm:p-6">
            <Button
              className="min-h-24 w-full flex-col gap-2 rounded-[1.5rem] bg-primary text-primary-foreground shadow-sm hover:bg-primary/95"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Camera aria-hidden="true" className="size-7 text-highlight" />
              <span className="text-base font-semibold">Prendre une photo</span>
            </Button>
            {previewUrl ? (
              <div className="relative aspect-[4/3] max-h-80 overflow-hidden rounded-2xl bg-muted">
                <Image
                  alt="Aperçu du repas sélectionné"
                  className="object-cover"
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 600px"
                  src={previewUrl}
                />
              </div>
            ) : null}
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
            <input
              ref={fileInputRef}
              accept={allowedMimeTypes.join(",")}
              aria-label="Choisir une photo du repas"
              capture="environment"
              className="sr-only"
              onChange={(event) =>
                void onImageSelected(event.target.files?.[0])
              }
              type="file"
            />
          </div>

          <div className="px-1 pt-1">
            <label
              className="text-base font-semibold"
              htmlFor="meal-description"
            >
              Ou décris ton repas
            </label>
            <textarea
              className="mt-3 min-h-24 w-full resize-y rounded-2xl border-0 bg-card p-4 text-base shadow-sm outline-none transition placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-ring"
              id="meal-description"
              maxLength={5000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex. : 150 g de riz, 200 g de poulet et une pomme"
              value={description}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <Button
                className="min-h-12 rounded-full px-6"
                disabled={isAnalyzing || description.trim().length < 3}
                onClick={() => void analyzeText()}
                size="lg"
                type="button"
              >
                {isAnalyzing ? "Analyse en cours…" : "Continuer"}
              </Button>
              <Button
                className="min-h-11 rounded-full px-4 text-muted-foreground"
                onClick={() => setIsFoodSearchOpen(true)}
                type="button"
                variant="ghost"
              >
                <Search aria-hidden="true" className="mr-2 size-4" />
                Chercher un aliment
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {initialMeal ? (
        <section className="soft-panel space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="font-semibold">Photo du repas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Vous pouvez conserver, remplacer ou retirer la photo.
            </p>
          </div>
          {previewUrl ? (
            <div className="relative aspect-[4/3] max-h-80 overflow-hidden rounded-2xl bg-muted">
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
                className="space-y-3 rounded-2xl bg-background/80 p-4"
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
                      className="h-11 w-full rounded-xl border-0 bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                        className="h-11 w-full rounded-xl border-0 bg-card px-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

          {isFoodSearchOpen ? (
            <section
              aria-label="Rechercher un aliment"
              className="space-y-4 rounded-2xl bg-background p-4 sm:p-5"
              ref={foodSearchRef}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-medium">Rechercher un aliment</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Recherchez par nom ou code-barres. Les valeurs sont
                    indiquées pour 100 g.
                  </p>
                </div>
                <Button
                  aria-label="Fermer la recherche"
                  onClick={() => setIsFoodSearchOpen(false)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X aria-hidden="true" className="size-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setBarcodeScannerError("");
                    setIsBarcodeScannerOpen((open) => !open);
                  }}
                  type="button"
                  variant="outline"
                >
                  <Camera aria-hidden="true" className="mr-2 size-4" />
                  {isBarcodeScannerOpen
                    ? "Arrêter le scan"
                    : "Scanner avec la caméra"}
                </Button>
                <p className="self-center text-xs text-muted-foreground">
                  Un lecteur de code-barres connecté fonctionne aussi dans le
                  champ de recherche.
                </p>
              </div>

              {isBarcodeScannerOpen ? (
                <div className="space-y-2">
                  <video
                    aria-label="Aperçu de la caméra pour scanner le code-barres"
                    autoPlay
                    className="max-h-64 w-full rounded-lg bg-black object-contain"
                    muted
                    playsInline
                    ref={barcodeVideoRef}
                  />
                  <p className="text-sm text-muted-foreground" role="status">
                    Placez le code-barres dans le champ de la caméra.
                  </p>
                </div>
              ) : null}

              {barcodeScannerError ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {barcodeScannerError}
                </p>
              ) : null}

              <div className="flex gap-2" role="search">
                <label className="sr-only" htmlFor="food-search">
                  Nom de l’aliment ou code-barres
                </label>
                <input
                  autoComplete="off"
                  className="h-12 min-w-0 flex-1 rounded-xl border-0 bg-card px-4 text-base shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  id="food-search"
                  inputMode="search"
                  maxLength={80}
                  onChange={(event) => setFoodSearchQuery(event.target.value)}
                  onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                    if (
                      event.key === "Enter" &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      void searchFoods();
                    }
                  }}
                  placeholder="Nom, EAN ou UPC"
                  ref={foodSearchInputRef}
                  value={foodSearchQuery}
                />
                <Button
                  disabled={
                    isSearchingFoods || foodSearchQuery.trim().length < 2
                  }
                  onClick={() => void searchFoods()}
                  type="button"
                >
                  {isSearchingFoods ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <Search aria-hidden="true" className="size-4" />
                  )}
                  <span className="sr-only sm:not-sr-only sm:ml-2">
                    Rechercher
                  </span>
                </Button>
              </div>

              {foodSearchError ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {foodSearchError}
                </p>
              ) : null}

              {foodSearchResults.length > 0 ? (
                <ul aria-label="Résultats de recherche" className="space-y-2">
                  {foodSearchResults.map((food, index) => (
                    <li key={`${food.name}-${food.brand}-${index}`}>
                      <button
                        className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        disabled={fields.length >= 50}
                        onClick={() => addFoodSearchResult(food)}
                        type="button"
                      >
                        {food.image_url ? (
                          <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                            <Image
                              alt={`Photo du produit ${food.name}`}
                              className="object-contain"
                              fill
                              sizes="64px"
                              src={food.image_url}
                              unoptimized
                            />
                          </span>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground"
                          >
                            Image indisponible
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block font-medium">{food.name}</span>
                          {food.brand ? (
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {food.brand}
                            </span>
                          ) : null}
                          <span className="mt-2 block text-xs text-muted-foreground">
                            {Math.round(food.calories_per_100g)} kcal · P{" "}
                            {food.protein_per_100g} g · G {food.carbs_per_100g}{" "}
                            g · L {food.fat_per_100g} g / 100 g
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="text-xs text-muted-foreground">
                Données nutritionnelles fournies par{" "}
                <a
                  className="underline underline-offset-2"
                  href="https://world.openfoodfacts.org/"
                  rel="noreferrer"
                  target="_blank"
                >
                  Open Food Facts
                </a>{" "}
                (ODbL). Vérifiez les valeurs avant l’enregistrement.
              </p>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              className="gap-2"
              disabled={fields.length >= 50}
              onClick={() => {
                setIsFoodSearchOpen((open) => !open);
                setFoodSearchError("");
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
            href={initialMeal ? `/meal/${initialMeal.id}` : "/dashboard"}
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
