"use client";

import Image from "next/image";
import type { RefObject } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { usePerformanceMount } from "@/lib/performance/client";

const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export function PhotoEntryPanel({
  inputRef,
  previewUrl,
  uploadedPath,
  isAnalyzing,
  initialMeal,
  onImageSelected,
  onAnalyzeAgain,
  onRemoveImage,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  previewUrl: string | null;
  uploadedPath: string | null;
  isAnalyzing: boolean;
  initialMeal: boolean;
  onImageSelected: (file: File | undefined) => void;
  onAnalyzeAgain: () => void;
  onRemoveImage: () => void;
}) {
  usePerformanceMount("PhotoEntryPanel");
  return (
    <section className="soft-panel space-y-4 p-5 sm:p-6">
      {initialMeal ? (
        <>
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
              onClick={() => inputRef.current?.click()}
              type="button"
              variant="outline"
            >
              Remplacer la photo
            </Button>
            {previewUrl ? (
              <Button onClick={onRemoveImage} type="button" variant="ghost">
                Retirer la photo
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <Button
            className="min-h-24 w-full flex-col gap-2 rounded-[1.5rem] bg-primary text-primary-foreground shadow-sm hover:bg-primary/95"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
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
              onClick={onAnalyzeAgain}
              type="button"
              variant="secondary"
            >
              {isAnalyzing ? "Analyse…" : "Relancer l’analyse"}
            </Button>
          ) : null}
        </>
      )}
      <input
        ref={inputRef}
        accept={allowedMimeTypes.join(",")}
        aria-label={
          initialMeal
            ? "Remplacer la photo du repas"
            : "Choisir une photo du repas"
        }
        capture="environment"
        className="sr-only"
        onChange={(event) => onImageSelected(event.target.files?.[0])}
        type="file"
      />
    </section>
  );
}

export function TextEntryPanel({
  isAnalyzing,
  onAnalyze,
}: {
  isAnalyzing: boolean;
  onAnalyze: (description: string) => void;
}) {
  usePerformanceMount("TextEntryPanel");
  const [description, setDescription] = useState("");

  return (
    <section className="space-y-3 px-1 pt-1">
      <label className="text-base font-semibold" htmlFor="meal-description">
        Décris ton repas
      </label>
      <textarea
        className="min-h-24 w-full resize-y rounded-2xl border-0 bg-card p-4 text-base shadow-sm outline-none transition placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-ring"
        id="meal-description"
        maxLength={5000}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Ex. : 150 g de riz, 200 g de poulet et une pomme"
        value={description}
      />
      <Button
        className="min-h-12 rounded-full px-6"
        disabled={isAnalyzing || description.trim().length < 3}
        onClick={() => onAnalyze(description)}
        size="lg"
        type="button"
      >
        {isAnalyzing ? "Analyse en cours…" : "Continuer"}
      </Button>
    </section>
  );
}
