import { ArrowRight, Camera } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
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
          <BrandMark className="size-10" />
          <span className="text-lg font-semibold tracking-tight">Lumo</span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div className="max-w-xl">
            <p className="eyebrow mb-5">Manger, noter, continuer</p>
            <h1 className="text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl md:text-7xl">
              Un repas.
              <br />
              Une photo.
              <br />
              <span className="text-primary">C’est noté.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-muted-foreground">
              Note ce que tu manges en quelques secondes et garde un œil simple
              sur ta journée.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                href="/register"
              >
                Commencer
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                className="rounded-full px-3 py-2 text-sm font-semibold text-primary hover:bg-accent"
                href="/login"
              >
                J’ai déjà un compte
              </Link>
            </div>
          </div>

          <div
            aria-label="Aperçu du suivi nutritionnel"
            className="hero-panel relative p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white/70">Aujourd’hui</p>
                <p className="mt-1 text-2xl font-semibold">À ton rythme</p>
              </div>
              <BrandMark className="size-11 rounded-full bg-white/10 p-2" />
            </div>

            <div className="mt-8 rounded-[1.5rem] bg-white/10 p-5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-white/75">Il te reste</span>
                <span className="text-3xl font-semibold tabular-nums">
                  350 kcal
                </span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-4/5 rounded-full bg-highlight" />
              </div>
              <p className="mt-3 text-sm text-white/70">
                Ta journée, en un coup d’œil.
              </p>
            </div>

            <div className="mt-5 flex items-center gap-4 rounded-2xl bg-highlight p-4 text-primary">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-highlight">
                <Camera aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="font-semibold">Un repas à noter ?</p>
                <p className="mt-1 text-sm text-primary/75">
                  Prends une photo. C’est tout.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-5 text-sm text-muted-foreground">
          Simplement, un repas après l’autre.
        </footer>
      </div>
    </main>
  );
}
