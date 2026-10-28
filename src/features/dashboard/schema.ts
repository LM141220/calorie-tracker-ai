import { z } from "zod";

export const dashboardSummarySchema = z.object({
  timezone: z.string(),
  today: z.object({
    date: z.string(),
    meal_count: z.number().int().nonnegative(),
    calories: z.number().nonnegative(),
    protein: z.number().nonnegative(),
    carbs: z.number().nonnegative(),
    fat: z.number().nonnegative(),
  }),
  weekly_average: z.number().nonnegative(),
  monthly_average: z.number().nonnegative(),
  week: z.array(
    z.object({
      date: z.string(),
      calories: z.number().nonnegative(),
    }),
  ),
});

export const dashboardGoalsSchema = z
  .object({
    daily_calories: z.number().nonnegative(),
    daily_protein: z.number().nonnegative(),
    daily_carbs: z.number().nonnegative(),
    daily_fat: z.number().nonnegative(),
    timezone: z.string(),
  })
  .nullable();

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export type DashboardGoals = NonNullable<z.infer<typeof dashboardGoalsSchema>>;

export type DashboardData = {
  goals: DashboardGoals;
  summary: DashboardSummary;
};
