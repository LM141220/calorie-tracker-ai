"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePerformanceMount } from "@/lib/performance/client";
import type { FoodSearchResult } from "@/validators/foods";

const BarcodeScanner = dynamic(
  () => import("@/components/meals/barcode-scanner"),
  {
    ssr: false,
    loading: () => (
      <div
        aria-label="Chargement du scanner"
        aria-busy="true"
        className="h-48 animate-pulse rounded-lg bg-muted"
      />
    ),
  },
);

export default function FoodSearchPanel({
  isOpen,
  itemCount,
  onAddFood,
  onClose,
}: {
  isOpen: boolean;
  itemCount: number;
  onAddFood: (food: FoodSearchResult) => void;
  onClose: () => void;
}) {
  usePerformanceMount("FoodSearchPanel");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const searchPanelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsScannerOpen(false);
      return;
    }
    searchPanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    inputRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  const onBarcodeDetected = useCallback((barcode: string) => {
    setQuery(barcode);
    setError("");
    setIsScannerOpen(false);
  }, []);

  async function searchFoods() {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setError("Saisissez au moins 2 caractères.");
      return;
    }

    setIsSearching(true);
    setError("");
    setResults([]);
    try {
      const { searchOpenFoodFacts } =
        await import("@/services/foods/open-food-facts");
      const foods = await searchOpenFoodFacts(trimmedQuery);
      setResults(foods);
      if (foods.length === 0) {
        setError(
          "Aucun aliment avec des valeurs nutritionnelles complètes trouvé. Essayez un autre terme ou ajoutez-le manuellement.",
        );
      }
    } catch (searchError: unknown) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "La recherche a échoué. Réessayez.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section
      aria-label="Rechercher un aliment"
      className="space-y-4 rounded-2xl bg-background p-4 sm:p-5"
      ref={searchPanelRef}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-medium">Rechercher un aliment</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Recherchez par nom ou code-barres. Les valeurs sont indiquées pour
            100 g.
          </p>
        </div>
        <Button
          aria-label="Fermer la recherche"
          onClick={onClose}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setIsScannerOpen((open) => !open)}
          type="button"
          variant="outline"
        >
          <Camera aria-hidden="true" className="mr-2 size-4" />
          {isScannerOpen ? "Arrêter le scan" : "Scanner avec la caméra"}
        </Button>
        <p className="self-center text-xs text-muted-foreground">
          Un lecteur de code-barres connecté fonctionne aussi dans le champ de
          recherche.
        </p>
      </div>

      {isScannerOpen ? <BarcodeScanner onDetected={onBarcodeDetected} /> : null}

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
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void searchFoods();
            }
          }}
          placeholder="Nom, EAN ou UPC"
          ref={inputRef}
          value={query}
        />
        <Button
          disabled={isSearching || query.trim().length < 2}
          onClick={() => void searchFoods()}
          type="button"
        >
          {isSearching ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Search aria-hidden="true" className="size-4" />
          )}
          <span className="sr-only sm:not-sr-only sm:ml-2">Rechercher</span>
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-muted-foreground" role="status">
          {error}
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul aria-label="Résultats de recherche" className="space-y-2">
          {results.map((food, index) => (
            <li key={`${food.name}-${food.brand}-${index}`}>
              <button
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={itemCount >= 50}
                onClick={() => onAddFood(food)}
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
                    {food.protein_per_100g} g · G {food.carbs_per_100g} g · L{" "}
                    {food.fat_per_100g} g / 100 g
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
  );
}
