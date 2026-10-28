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
      <div className="mx-auto max-w-2xl px-5 py-5 pb-32 sm:px-6 sm:py-9 sm:pb-12">
        <Link
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-accent"
          href="/dashboard"
        >
          ← Accueil
        </Link>
        <header className="mb-5 mt-5">
          <p className="eyebrow">On y va</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Ajouter un repas
          </h1>
        </header>
        <MealEditor />
      </div>
    </main>
  );
}
