export type NutritionValues = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type PortionBaseline = NutritionValues & {
  weight_g: number;
};

export function createPortionBaseline(
  weight_g: number,
  nutrition: NutritionValues,
): PortionBaseline {
  return {
    weight_g: Number.isFinite(weight_g) && weight_g > 0 ? weight_g : 0,
    calories: Number.isFinite(nutrition.calories) ? nutrition.calories : 0,
    protein: Number.isFinite(nutrition.protein) ? nutrition.protein : 0,
    carbs: Number.isFinite(nutrition.carbs) ? nutrition.carbs : 0,
    fat: Number.isFinite(nutrition.fat) ? nutrition.fat : 0,
  };
}

export function scaleNutritionValues(
  baseline: PortionBaseline,
  weight_g: number,
): NutritionValues {
  const nutrition = {
    calories: Number.isFinite(baseline.calories) ? baseline.calories : 0,
    protein: Number.isFinite(baseline.protein) ? baseline.protein : 0,
    carbs: Number.isFinite(baseline.carbs) ? baseline.carbs : 0,
    fat: Number.isFinite(baseline.fat) ? baseline.fat : 0,
  };
  if (!Number.isFinite(baseline.weight_g) || baseline.weight_g <= 0) {
    return nutrition;
  }

  const ratio =
    (Number.isFinite(weight_g) && weight_g > 0 ? weight_g : 0) /
    baseline.weight_g;
  return {
    calories: nutrition.calories * ratio,
    protein: nutrition.protein * ratio,
    carbs: nutrition.carbs * ratio,
    fat: nutrition.fat * ratio,
  };
}
