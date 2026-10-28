import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ArrowRight, UserRound } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { AppHeader } from "@/components/app-header";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Profil",
};

export default async function ProfilePage() {
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
      <div className="mx-auto max-w-xl px-5 py-7 pb-32 sm:px-6 sm:py-12 sm:pb-12">
        <header className="mb-8">
          <p className="eyebrow">Ton espace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Profil</h1>
        </header>

        <section className="soft-panel overflow-hidden">
          <div className="flex items-center gap-4 p-5 sm:p-6">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
              <UserRound aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Compte connecté
              </p>
              <p className="mt-1 break-all font-medium">
                {user.email ?? "Adresse e-mail indisponible"}
              </p>
            </div>
          </div>

          <div className="px-4 pb-4">
            <Link
              className="flex min-h-14 items-center justify-between rounded-2xl px-3 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/settings"
            >
              Objectifs
              <ArrowRight
                aria-hidden="true"
                className="size-4 text-muted-foreground"
              />
            </Link>
            <div className="flex min-h-14 items-center px-3">
              <InstallPrompt />
            </div>
            <div className="mt-2 border-t border-border/70 pt-3">
              <LogoutButton />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
