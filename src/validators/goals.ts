import { z } from "zod";

import type {
  ActivityLevel,
  NutritionGoal,
  ProfileSex,
} from "@/types/database.types";

const profileSexValues = [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
] as const satisfies readonly ProfileSex[];

const activityLevelValues = [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extra_active",
] as const satisfies readonly ActivityLevel[];

const nutritionGoalValues = [
  "lose_weight",
  "maintain_weight",
  "gain_muscle",
] as const satisfies readonly NutritionGoal[];

export const goalSettingsSchema = z
  .object({
    current_weight_kg: z.number().finite().min(20).max(500),
    height_cm: z.number().finite().min(50).max(300),
    age_years: z.number().int().min(13).max(120),
    sex: z.enum(profileSexValues),
    activity_level: z.enum(activityLevelValues),
    goal_type: z.enum(nutritionGoalValues),
    daily_calories: z.number().int().min(500).max(10000),
    daily_protein: z.number().finite().min(0).max(1000),
    daily_carbs: z.number().finite().min(0).max(1500),
    daily_fat: z.number().finite().min(0).max(1000),
    timezone: z.string().min(1).max(100),
  })
  .strict();

export type GoalSettingsInput = z.infer<typeof goalSettingsSchema>;
