import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

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
      <div className="mx-auto max-w-xl px-4 py-8 pb-28 sm:px-6 sm:py-12 sm:pb-12">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        </header>

        <section className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
          <div>
            <p className="text-sm text-muted-foreground">Compte connecté</p>
            <p className="mt-1 break-all font-medium">
              {user.email ?? "Adresse e-mail indisponible"}
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t pt-5">
            <Link
              className="inline-flex min-h-11 items-center justify-between rounded-lg px-3 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href="/settings"
            >
              Objectifs
              <span aria-hidden="true">→</span>
            </Link>
            <InstallPrompt />
            <div className="border-t pt-4">
              <LogoutButton />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
