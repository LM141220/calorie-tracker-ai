"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { saveGoalSettingsAction } from "@/features/goals/actions";
import { estimateNutritionTargets } from "@/features/goals/calorie-estimation";
import { goalSettingsSchema, type GoalSettingsInput } from "@/validators/goals";

type SettingsFormProps = {
  initialValues: Omit<GoalSettingsInput, "timezone"> & { timezone: string };
};

const fieldClassName = "field-premium";

export function SettingsForm({ initialValues }: SettingsFormProps) {
  const [message, setMessage] = useState("");
  const [succeeded, setSucceeded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<GoalSettingsInput>({
    resolver: zodResolver(goalSettingsSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) {
      form.setValue("timezone", timezone);
    }
  }, [form]);

  function applyRecommendation() {
    const values = form.getValues();
    const recommendation = estimateNutritionTargets({
      weightKg: values.current_weight_kg,
      heightCm: values.height_cm,
      ageYears: values.age_years,
      sex: values.sex,
      activityLevel: values.activity_level,
      goal: values.goal_type,
    });

    form.setValue("daily_calories", recommendation.calories, {
      shouldValidate: true,
    });
    form.setValue("daily_protein", recommendation.protein, {
      shouldValidate: true,
    });
    form.setValue("daily_carbs", recommendation.carbs, {
      shouldValidate: true,
    });
    form.setValue("daily_fat", recommendation.fat, {
      shouldValidate: true,
    });
    setMessage(
      "Estimation calculée. Enregistrez pour appliquer ces objectifs.",
    );
    setSucceeded(true);
  }

  const onSubmit = form.handleSubmit((values) => {
    setMessage("");
    startTransition(async () => {
      const result = await saveGoalSettingsAction(values);
      setMessage(result.message);
      setSucceeded(result.success);
    });
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit} noValidate>
      <section className="soft-panel p-6 sm:p-8">
        <h2 className="text-sm font-medium text-muted-foreground">
          Calories par jour
        </h2>
        <div className="mt-3 flex items-baseline gap-2">
          <label className="sr-only" htmlFor="daily_calories">
            Objectif calorique quotidien
          </label>
          <input
            className="w-full max-w-56 border-0 bg-transparent p-0 text-5xl font-semibold tabular-nums tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring"
            id="daily_calories"
            max={10000}
            min={500}
            step={1}
            type="number"
            {...form.register("daily_calories", {
              setValueAs: (value: string) => Number.parseInt(value, 10),
            })}
          />
          <span className="text-lg text-muted-foreground">kcal</span>
        </div>
        {form.formState.errors.daily_calories ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {form.formState.errors.daily_calories.message}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">
          Cette cible détermine les calories restantes sur l’accueil.
        </p>
      </section>

      <details className="soft-panel group overflow-hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 font-medium [&::-webkit-details-marker]:hidden">
          <span>Ajuster les macros</span>
          <span
            aria-hidden="true"
            className="text-muted-foreground transition-transform group-open:rotate-180"
          >
            ↓
          </span>
        </summary>
        <section className="border-t border-border/70 p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">
            Modifiez ces objectifs si vous souhaitez suivre vos macros.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {(
              [
                ["daily_protein", "Protéines (g)", 0, 1000, 0.1],
                ["daily_carbs", "Glucides (g)", 0, 1500, 0.1],
                ["daily_fat", "Lipides (g)", 0, 1000, 0.1],
              ] as const
            ).map(([name, label, min, max, step]) => (
              <div key={name}>
                <label
                  className="mb-1.5 block text-sm font-medium"
                  htmlFor={name}
                >
                  {label}
                </label>
                <input
                  className={fieldClassName}
                  id={name}
                  max={max}
                  min={min}
                  step={step}
                  type="number"
                  {...form.register(name, { valueAsNumber: true })}
                />
                {form.formState.errors[name] ? (
                  <p className="mt-1 text-sm text-destructive" role="alert">
                    {form.formState.errors[name]?.message}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </details>

      <details className="soft-panel group overflow-hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 font-medium [&::-webkit-details-marker]:hidden">
          <span>Modifier mon profil nutritionnel</span>
          <span
            aria-hidden="true"
            className="text-muted-foreground transition-transform group-open:rotate-180"
          >
            ↓
          </span>
        </summary>
        <section className="border-t border-border/70 p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">
            Ces informations servent uniquement à calculer une recommandation.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="current_weight_kg"
              >
                Poids actuel (kg)
              </label>
              <input
                className={fieldClassName}
                id="current_weight_kg"
                max={500}
                min={20}
                step="0.1"
                type="number"
                {...form.register("current_weight_kg", { valueAsNumber: true })}
              />
              {form.formState.errors.current_weight_kg ? (
                <p className="mt-1 text-sm text-destructive" role="alert">
                  {form.formState.errors.current_weight_kg.message}
                </p>
              ) : null}
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="height_cm"
              >
                Taille (cm)
              </label>
              <input
                className={fieldClassName}
                id="height_cm"
                max={300}
                min={50}
                step="0.1"
                type="number"
                {...form.register("height_cm", { valueAsNumber: true })}
              />
              {form.formState.errors.height_cm ? (
                <p className="mt-1 text-sm text-destructive" role="alert">
                  {form.formState.errors.height_cm.message}
                </p>
              ) : null}
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="age_years"
              >
                Âge
              </label>
              <input
                className={fieldClassName}
                id="age_years"
                max={120}
                min={13}
                type="number"
                {...form.register("age_years", { valueAsNumber: true })}
              />
              {form.formState.errors.age_years ? (
                <p className="mt-1 text-sm text-destructive" role="alert">
                  {form.formState.errors.age_years.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="sex">
                Sexe pour l’estimation
              </label>
              <select
                className={fieldClassName}
                id="sex"
                {...form.register("sex")}
              >
                <option value="prefer_not_to_say">
                  Je préfère ne pas préciser
                </option>
                <option value="female">Femme</option>
                <option value="male">Homme</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="activity_level"
              >
                Niveau d’activité
              </label>
              <select
                className={fieldClassName}
                id="activity_level"
                {...form.register("activity_level")}
              >
                <option value="sedentary">Sédentaire</option>
                <option value="lightly_active">Légèrement actif</option>
                <option value="moderately_active">Modérément actif</option>
                <option value="very_active">Très actif</option>
                <option value="extra_active">Extrêmement actif</option>
              </select>
            </div>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium"
                htmlFor="goal_type"
              >
                Objectif
              </label>
              <select
                className={fieldClassName}
                id="goal_type"
                {...form.register("goal_type")}
              >
                <option value="lose_weight">Perte de poids</option>
                <option value="maintain_weight">Maintien</option>
                <option value="gain_muscle">Prise de masse</option>
              </select>
            </div>
          </div>
          <Button
            className="mt-5 min-h-11"
            onClick={applyRecommendation}
            type="button"
            variant="outline"
          >
            Calculer une recommandation
          </Button>
        </section>
      </details>

      {message ? (
        <p
          className={`rounded-lg p-3 text-sm ${succeeded ? "bg-secondary text-secondary-foreground" : "bg-destructive/10 text-destructive"}`}
          role={succeeded ? "status" : "alert"}
        >
          {message}
        </p>
      ) : null}

      <Button
        className="w-full sm:w-auto"
        disabled={isPending}
        size="lg"
        type="submit"
      >
        {isPending ? "Enregistrement…" : "Enregistrer mes objectifs"}
      </Button>
    </form>
  );
}
