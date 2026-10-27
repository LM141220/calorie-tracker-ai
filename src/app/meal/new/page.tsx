import type { Metadata } from "next";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
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
      <AppHeader />
      <div className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:px-6 sm:py-10 sm:pb-12">
        <Link
          className="text-sm font-medium text-primary hover:underline"
          href="/dashboard"
        >
          ← Retour à l’accueil
        </Link>
        <header className="mb-6 mt-5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Ajouter un repas
          </h1>
        </header>
        <MealEditor />
      </div>
    </main>
  );
}
