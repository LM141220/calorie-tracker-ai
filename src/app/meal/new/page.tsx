import type { Metadata } from "next";
import Link from "next/link";

import { MealEditor } from "@/components/meals/meal-editor";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Ajouter un repas",
};

export default async function NewMealPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          className="text-sm font-medium text-primary hover:underline"
          href="/dashboard"
        >
          ← Retour au dashboard
        </Link>
        <header className="mb-8 mt-6">
          <p className="text-sm font-medium text-primary">Suivi nutritionnel</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Ajouter un repas
          </h1>
          <p className="mt-2 text-muted-foreground">
            Photographiez votre assiette ou décrivez ce que vous avez mangé.
          </p>
        </header>
        <MealEditor />
      </div>
    </main>
  );
}
