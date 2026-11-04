import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Statut du compte",
};

export default async function AccountStatusPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("approval_status, requested_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    console.error("Account status page profile lookup failed.", error);
    throw new Error("Impossible de vérifier le statut de votre compte.");
  }

  if (profile.approval_status === "approved") {
    redirect("/dashboard");
  }

  const isRejected = profile.approval_status === "rejected";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-5 py-12">
      <section className="soft-panel w-full max-w-lg p-6 sm:p-8">
        <p className="eyebrow">Accès à Lumo</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {isRejected ? "Demande non approuvée" : "Demande en cours"}
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          {isRejected
            ? "Votre demande d’accès n’a pas été approuvée. Contactez l’administrateur si vous pensez qu’il s’agit d’une erreur."
            : "Votre compte a bien été créé. Vous pourrez accéder à l’application après validation par l’administrateur."}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Demande du{" "}
          {new Date(profile.requested_at).toLocaleString("fr-FR", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
