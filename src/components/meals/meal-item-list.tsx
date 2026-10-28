"use client";

import { Trash2 } from "lucide-react";
import type { RefObject } from "react";
import type { FieldArrayWithId, UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  createPortionBaseline,
  scaleNutritionValues,
  type PortionBaseline,
} from "@/features/meals/portion-scaling";
import type { SaveMealInput } from "@/validators/meals";
import { usePerformanceMount } from "@/lib/performance/client";

const nutritionFields = [
  ["weight_g", "Poids (g)", 100_000],
  ["calories", "Calories", 1_000_000],
  ["protein", "Protéines (g)", 100_000],
  ["carbs", "Glucides (g)", 100_000],
  ["fat", "Lipides (g)", 100_000],
] as const;

export function MealItemList({
  fields,
  form,
  portionBaselines,
  onRemove,
}: {
  fields: FieldArrayWithId<SaveMealInput, "items", "fieldKey">[];
  form: UseFormReturn<SaveMealInput>;
  portionBaselines: RefObject<Record<string, PortionBaseline>>;
  onRemove: (index: number) => void;
}) {
  usePerformanceMount("MealItemList");
  if (fields.length === 0) {
    return (
      <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
        Analysez une photo ou une description pour commencer, ou ajoutez un
        aliment manuellement.
      </p>
    );
  }

  return (
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
              onClick={() => onRemove(index)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {nutritionFields.map(([key, label, max]) => (
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
                  onChange={(event) => {
                    const registration = form.register(
                      `items.${index}.${key}`,
                      { valueAsNumber: true },
                    );
                    registration.onChange(event);

                    const fieldKey = fields[index]?.fieldKey;
                    if (!fieldKey) {
                      return;
                    }

                    if (key === "weight_g") {
                      const nextWeight =
                        event.target.value === ""
                          ? 0
                          : Number(event.target.value);
                      const baseline = portionBaselines.current[fieldKey];
                      if (!baseline) {
                        return;
                      }

                      const scaled = scaleNutritionValues(baseline, nextWeight);
                      for (const nutrient of [
                        "calories",
                        "protein",
                        "carbs",
                        "fat",
                      ] as const) {
                        form.setValue(
                          `items.${index}.${nutrient}`,
                          scaled[nutrient],
                          { shouldValidate: true },
                        );
                      }
                      if (baseline.weight_g <= 0 && nextWeight > 0) {
                        portionBaselines.current[fieldKey] =
                          createPortionBaseline(nextWeight, scaled);
                      }
                    } else {
                      const currentItem = form.getValues(`items.${index}`);
                      const changedValue =
                        event.target.value === ""
                          ? 0
                          : Number(event.target.value);
                      const currentWeight =
                        Number.isFinite(currentItem.weight_g) &&
                        currentItem.weight_g > 0
                          ? currentItem.weight_g
                          : 0;
                      const safeChangedValue = Number.isFinite(changedValue)
                        ? changedValue
                        : 0;
                      portionBaselines.current[fieldKey] = {
                        weight_g: currentWeight,
                        calories:
                          key === "calories"
                            ? safeChangedValue
                            : currentItem.calories,
                        protein:
                          key === "protein"
                            ? safeChangedValue
                            : currentItem.protein,
                        carbs:
                          key === "carbs"
                            ? safeChangedValue
                            : currentItem.carbs,
                        fat: key === "fat" ? safeChangedValue : currentItem.fat,
                      };
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
