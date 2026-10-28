"use client";

import { useWatch, type Control } from "react-hook-form";

import type { SaveMealInput } from "@/validators/meals";
import { usePerformanceMount } from "@/lib/performance/client";

export function MealSummary({ control }: { control: Control<SaveMealInput> }) {
  usePerformanceMount("MealSummary");
  const items = useWatch({ control, name: "items" });
  const totalCalories = items.reduce(
    (total, item) => total + (item.calories || 0),
    0,
  );

  return (
    <span className="text-sm text-muted-foreground">
      Total : {Math.round(totalCalories)} kcal
    </span>
  );
}
