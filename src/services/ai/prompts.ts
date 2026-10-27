export const MEAL_ANALYSIS_PROMPT = `Analyse le repas fourni et estime les aliments ainsi que leurs valeurs nutritionnelles.
Retourne uniquement un objet JSON valide, sans markdown ni texte supplémentaire, avec exactement cette structure :
{
  "foods": [
    {
      "name": "nom de l’aliment",
      "estimated_weight_g": 0,
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0
    }
  ],
  "total_calories": 0,
  "total_protein": 0,
  "total_carbs": 0,
  "total_fat": 0,
  "confidence": 0
}
Les calories et macros sont des nombres en grammes ou kilocalories. confidence est un nombre compris entre 0 et 1. Estime les quantités de façon prudente. Les totaux doivent correspondre à la somme des aliments.`;

export function mealTextPrompt(description: string): string {
  return `${MEAL_ANALYSIS_PROMPT}\n\nDescription du repas :\n${description}`;
}
