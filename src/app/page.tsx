import { ArrowRight, Camera, ChartNoAxesCombined, Leaf } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    console.error("Unable to check session on the home page.", error);
    throw new Error("Impossible de vérifier votre session.");
  }

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6 sm:px-10">
        <header className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf aria-hidden="true" className="size-5" />
          </span>
          <span className="font-semibold tracking-tight">
            Calorie Tracker AI
          </span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
          <div className="max-w-xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
              <span className="size-2 rounded-full bg-primary" />
              Votre nutrition, en toute simplicité
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Mieux manger commence par{" "}
              <span className="text-primary">mieux comprendre.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
              Une base claire pour suivre vos repas, comprendre vos habitudes et
              avancer vers vos objectifs, un jour à la fois.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                href="/register"
              >
                Commencer
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                className="text-sm font-medium text-primary hover:underline"
                href="/login"
              >
                J’ai déjà un compte
              </Link>
            </div>
          </div>

          <div
            aria-label="Aperçu du suivi nutritionnel"
            className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Aujourd’hui</p>
                <p className="mt-1 text-2xl font-semibold">Votre équilibre</p>
              </div>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                <ChartNoAxesCombined aria-hidden="true" className="size-5" />
              </span>
            </div>

            <div className="mt-8 rounded-2xl bg-muted/70 p-5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-muted-foreground">
                  Objectif quotidien
                </span>
                <span className="text-sm font-medium">À venir</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full w-1/2 rounded-full bg-primary" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Vos progrès apparaîtront ici
              </p>
            </div>

            <div className="mt-5 flex items-center gap-4 rounded-2xl border p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <Camera aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="font-medium">Un repas à ajouter ?</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Prenez une photo ou décrivez-le.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t py-5 text-sm text-muted-foreground">
          Prenez soin de vous, à votre rythme.
        </footer>
      </div>
    </main>
  );
}
