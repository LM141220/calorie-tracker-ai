"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { goalSettingsSchema } from "@/validators/goals";

export type GoalActionResult = {
  success: boolean;
  message: string;
};

export async function saveGoalSettingsAction(
  input: unknown,
): Promise<GoalActionResult> {
  const parsed = goalSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ?? "Les objectifs sont invalides.",
    };
  }

  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: parsed.data.timezone });
  } catch {
    return { success: false, message: "Le fuseau horaire n’est pas reconnu." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      message: "Votre session a expiré. Reconnectez-vous.",
    };
  }

  const { error } = await supabase.from("user_goals").upsert(
    {
      user_id: user.id,
      current_weight_kg: parsed.data.current_weight_kg,
      height_cm: parsed.data.height_cm,
      age_years: parsed.data.age_years,
      sex: parsed.data.sex,
      activity_level: parsed.data.activity_level,
      goal_type: parsed.data.goal_type,
      daily_calories: parsed.data.daily_calories,
      daily_protein: parsed.data.daily_protein,
      daily_carbs: parsed.data.daily_carbs,
      daily_fat: parsed.data.daily_fat,
      daily_calories_is_custom: true,
      timezone: parsed.data.timezone,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Goal settings save failed.", error);
    return {
      success: false,
      message: "Impossible d’enregistrer vos objectifs. Vérifiez les valeurs.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { success: true, message: "Objectifs enregistrés." };
}
