"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getReusableFoodsAction } from "@/features/meals/actions";
import type { ReusableFood, ReusableFoodsData } from "@/features/meals/types";

export default function ReusableFoodsPanel({
  itemCount,
  onAddFood,
  onClose,
}: {
  itemCount: number;
  onAddFood: (food: ReusableFood) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<ReusableFoodsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getReusableFoodsAction()
      .then((result) => {
        if (!active) {
          return;
        }
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message);
        }
      })
      .catch((cause: unknown) => {
        console.error("Reusable foods request failed.", cause);
        if (active) {
          setError("Impossible de charger vos aliments. Réessayez.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  function renderFoods(title: string, foods: ReusableFood[], empty: string) {
    return (
      <section>
        <h3 className="font-semibold">{title}</h3>
        {foods.length ? (
          <ul className="mt-2 divide-y divide-border/70">
            {foods.map((food, index) => (
              <li
                className="flex items-center justify-between gap-3 py-3"
                key={`${food.food_name}-${food.weight_g}-${index}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {food.food_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {food.weight_g} g · {Math.round(food.calories)} kcal
                  </p>
                </div>
                <Button
                  aria-label={`Ajouter ${food.food_name} au repas`}
                  disabled={itemCount >= 50}
                  onClick={() => onAddFood(food)}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <Plus aria-hidden="true" className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="Aliments réutilisables"
      className="soft-panel space-y-5 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Aliments récents et favoris</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutez une copie modifiable à ce repas.
          </p>
        </div>
        <Button
          aria-label="Fermer les aliments réutilisables"
          onClick={onClose}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" className="size-4" />
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : data ? (
        <div className="space-y-5">
          {renderFoods(
            "Favoris",
            data.favorites,
            "Aucun aliment favori pour le moment.",
          )}
          {renderFoods(
            "Récemment utilisés",
            data.recent,
            "Vos aliments apparaîtront ici après l’enregistrement d’un repas.",
          )}
        </div>
      ) : (
        <div
          aria-label="Chargement des aliments"
          className="h-24 animate-pulse rounded-xl bg-muted"
          role="status"
        />
      )}
    </section>
  );
}
