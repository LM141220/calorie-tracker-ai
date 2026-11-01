import type { ReusableFood } from "@/features/meals/types";

export function getReusableFoodKey(food: ReusableFood): string {
  return JSON.stringify([
    food.food_name,
    Number(food.weight_g),
    Number(food.calories),
    Number(food.protein),
    Number(food.carbs),
    Number(food.fat),
  ]);
}
