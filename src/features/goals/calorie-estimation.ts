import type {
  ActivityLevel,
  NutritionGoal,
  ProfileSex,
} from "@/types/database.types";

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

const calorieAdjustments: Record<NutritionGoal, number> = {
  lose_weight: -400,
  maintain_weight: 0,
  gain_muscle: 250,
};

type CalorieEstimateInput = {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: ProfileSex;
  activityLevel: ActivityLevel;
  goal: NutritionGoal;
};

export type NutritionTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function estimateNutritionTargets(
  input: CalorieEstimateInput,
): NutritionTargets {
  const sexAdjustment =
    input.sex === "male" ? 5 : input.sex === "female" ? -161 : -78;
  const basalMetabolicRate =
    10 * input.weightKg +
    6.25 * input.heightCm -
    5 * input.ageYears +
    sexAdjustment;
  const maintenanceCalories =
    basalMetabolicRate * activityMultipliers[input.activityLevel];
  const calories = Math.round(
    Math.min(
      10000,
      Math.max(500, maintenanceCalories + calorieAdjustments[input.goal]),
    ),
  );
  const protein = Math.round(Math.min(1000, input.weightKg * 1.8));
  const fat = Math.round(Math.min(1000, (calories * 0.3) / 9));
  const carbs = Math.round(
    Math.min(1500, Math.max(0, (calories - protein * 4 - fat * 9) / 4)),
  );

  return { calories, protein, carbs, fat };
}
