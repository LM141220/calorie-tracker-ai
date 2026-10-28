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
