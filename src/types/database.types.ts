export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileSex = "male" | "female" | "other" | "prefer_not_to_say";

export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extra_active";

export type NutritionGoal = "lose_weight" | "maintain_weight" | "gain_muscle";

type Relationship<
  ForeignKeyName extends string,
  Columns extends string[],
  IsOneToOne extends boolean,
  ReferencedRelation extends string,
  ReferencedColumns extends string[],
> = {
  foreignKeyName: ForeignKeyName;
  columns: Columns;
  isOneToOne: IsOneToOne;
  referencedRelation: ReferencedRelation;
  referencedColumns: ReferencedColumns;
};

type TableDefinition<Row, Insert, Update, Relationships = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<
        {
          id: string;
          email: string;
          created_at: string;
        },
        {
          id: string;
          email?: string;
          created_at?: string;
        },
        {
          id?: string;
          email?: string;
          created_at?: string;
        }
      >;
      user_goals: TableDefinition<
        {
          id: string;
          user_id: string;
          daily_calories: number;
          daily_protein: number;
          daily_carbs: number;
          daily_fat: number;
          current_weight_kg: number | null;
          height_cm: number | null;
          age_years: number | null;
          sex: ProfileSex | null;
          activity_level: ActivityLevel | null;
          goal_type: NutritionGoal | null;
          daily_calories_is_custom: boolean;
          timezone: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          daily_calories?: number;
          daily_protein?: number;
          daily_carbs?: number;
          daily_fat?: number;
          current_weight_kg?: number | null;
          height_cm?: number | null;
          age_years?: number | null;
          sex?: ProfileSex | null;
          activity_level?: ActivityLevel | null;
          goal_type?: NutritionGoal | null;
          daily_calories_is_custom?: boolean;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          daily_calories?: number;
          daily_protein?: number;
          daily_carbs?: number;
          daily_fat?: number;
          current_weight_kg?: number | null;
          height_cm?: number | null;
          age_years?: number | null;
          sex?: ProfileSex | null;
          activity_level?: ActivityLevel | null;
          goal_type?: NutritionGoal | null;
          daily_calories_is_custom?: boolean;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        },
        [
          Relationship<
            "user_goals_user_id_fkey",
            ["user_id"],
            true,
            "profiles",
            ["id"]
          >,
        ]
      >;
      meals: TableDefinition<
        {
          id: string;
          user_id: string;
          image_url: string | null;
          meal_name: string;
          notes: string | null;
          source_meal_id: string | null;
          source_favorite_id: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          image_url?: string | null;
          meal_name?: string;
          notes?: string | null;
          source_meal_id?: string | null;
          source_favorite_id?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          image_url?: string | null;
          meal_name?: string;
          notes?: string | null;
          source_meal_id?: string | null;
          source_favorite_id?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        [
          Relationship<
            "meals_user_id_fkey",
            ["user_id"],
            false,
            "profiles",
            ["id"]
          >,
        ]
      >;
      favorite_meals: TableDefinition<
        {
          id: string;
          user_id: string;
          source_meal_id: string | null;
          meal_name: string;
          notes: string | null;
          image_url: string | null;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          source_meal_id?: string | null;
          meal_name: string;
          notes?: string | null;
          image_url?: string | null;
          created_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          source_meal_id?: string | null;
          meal_name?: string;
          notes?: string | null;
          image_url?: string | null;
          created_at?: string;
        },
        [
          Relationship<
            "favorite_meals_user_id_fkey",
            ["user_id"],
            false,
            "profiles",
            ["id"]
          >,
          Relationship<
            "favorite_meals_source_meal_id_fkey",
            ["source_meal_id"],
            false,
            "meals",
            ["id"]
          >,
        ]
      >;
      favorite_meal_items: TableDefinition<
        {
          id: string;
          favorite_meal_id: string;
          sort_order: number;
          food_name: string;
          weight_g: number;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        },
        {
          id?: string;
          favorite_meal_id: string;
          sort_order?: number;
          food_name: string;
          weight_g: number;
          calories: number;
          protein?: number;
          carbs?: number;
          fat?: number;
        },
        {
          id?: string;
          favorite_meal_id?: string;
          sort_order?: number;
          food_name?: string;
          weight_g?: number;
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
        },
        [
          Relationship<
            "favorite_meal_items_favorite_meal_id_fkey",
            ["favorite_meal_id"],
            false,
            "favorite_meals",
            ["id"]
          >,
        ]
      >;
      meal_items: TableDefinition<
        {
          id: string;
          meal_id: string;
          food_name: string;
          weight_g: number;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          created_at: string;
        },
        {
          id?: string;
          meal_id: string;
          food_name: string;
          weight_g: number;
          calories: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          created_at?: string;
        },
        {
          id?: string;
          meal_id?: string;
          food_name?: string;
          weight_g?: number;
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          created_at?: string;
        },
        [
          Relationship<
            "meal_items_meal_id_fkey",
            ["meal_id"],
            false,
            "meals",
            ["id"]
          >,
        ]
      >;
      daily_stats: TableDefinition<
        {
          id: string;
          user_id: string;
          date: string;
          total_calories: number;
          total_protein: number;
          total_carbs: number;
          total_fat: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          date: string;
          total_calories?: number;
          total_protein?: number;
          total_carbs?: number;
          total_fat?: number;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          date?: string;
          total_calories?: number;
          total_protein?: number;
          total_carbs?: number;
          total_fat?: number;
          created_at?: string;
          updated_at?: string;
        },
        [
          Relationship<
            "daily_stats_user_id_fkey",
            ["user_id"],
            false,
            "profiles",
            ["id"]
          >,
        ]
      >;
    };
    Views: Record<string, never>;
    Functions: {
      save_meal: {
        Args: {
          p_meal_id: string | null;
          p_meal_name: string;
          p_notes: string | null;
          p_image_path: string | null;
          p_source_meal_id: string | null;
          p_source_favorite_id: string | null;
          p_items: Json;
        };
        Returns: string;
      };
      set_meal_favorite: {
        Args: {
          p_meal_id: string;
          p_is_favorite: boolean;
        };
        Returns: string;
      };
      delete_favorite_meal: {
        Args: {
          p_favorite_meal_id: string;
        };
        Returns: undefined;
      };
      get_dashboard_summary: {
        Args: Record<string, never>;
        Returns: Json;
      };
    };
    Enums: {
      profile_sex: ProfileSex;
      activity_level: ActivityLevel;
      nutrition_goal: NutritionGoal;
    };
    CompositeTypes: Record<string, never>;
  };
};
