export type ReusableMeal = {
  id: string;
  mealName: string;
  calories: number;
  createdAt: string;
  imagePreviewUrl: string | null;
};

export type ReusableMealsData = {
  recent: ReusableMeal[];
  favorites: ReusableMeal[];
  favoritesAvailable: boolean;
};

export type ReusableFood = {
  food_name: string;
  weight_g: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type ReusableFoodsData = {
  recent: ReusableFood[];
  favorites: ReusableFood[];
};
