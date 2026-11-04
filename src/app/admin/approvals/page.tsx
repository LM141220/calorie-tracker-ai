import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApprovalRequestActions } from "@/components/admin/approval-request-actions";
import { AppHeader } from "@/components/app-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAccountAccess } from "@/lib/auth/account-access";

export const metadata: Metadata = {
  title: "Demandes d’accès",
};

export default async function AccountApprovalsPage() {
  const supabase = await createSupabaseServerClient();
  const access = await getCurrentAccountAccess(supabase);

  if (!access.user) {
    redirect("/login");
  }
  if (access.approvalStatus !== "approved") {
    redirect("/account-status");
  }
  if (!access.isAdmin) {
    notFound();
  }

  const [pendingResult, eventsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, requested_at")
      .eq("approval_status", "pending")
      .order("requested_at", { ascending: true })
      .limit(100),
    supabase
      .from("account_approval_events")
      .select("id, profile_id, event_type, actor_id, comment, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (pendingResult.error || eventsResult.error) {
    console.error("Admin account approval queue failed to load.", {
      pendingError: pendingResult.error,
      eventsError: eventsResult.error,
    });
    throw new Error("Impossible de charger les demandes d’accès.");
  }

  const profileIds = Array.from(
    new Set(
      (eventsResult.data ?? [])
        .flatMap((event) => [event.profile_id, event.actor_id])
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const profilesResult = profileIds.length
    ? await supabase.from("profiles").select("id, email").in("id", profileIds)
    : { data: [], error: null };

  if (profilesResult.error) {
    console.error(
      "Admin approval history profiles query failed.",
      profilesResult.error,
    );
    throw new Error("Impossible de charger l’historique des demandes.");
  }

  const emails = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile.email]),
  );

  return (
    <main className="min-h-screen bg-muted/30">
      <AppHeader />
      <div className="mx-auto max-w-3xl px-5 py-7 pb-32 sm:px-6 sm:py-12 sm:pb-12">
        <header className="mb-8">
          <p className="eyebrow">Administration</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Demandes d’accès
          </h1>
          <p className="mt-2 text-muted-foreground">
            Examinez les nouveaux comptes et consultez les validations
            précédentes.
          </p>
        </header>

        <section aria-labelledby="pending-heading">
          <h2 className="mb-4 text-xl font-semibold" id="pending-heading">
            En attente ({pendingResult.data.length})
          </h2>
          {pendingResult.data.length ? (
            <ul className="space-y-4">
              {pendingResult.data.map((profile) => (
                <li className="soft-panel p-5" key={profile.id}>
                  <p className="break-all font-semibold">{profile.email}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Demandée le{" "}
                    {new Date(profile.requested_at).toLocaleString("fr-FR")}
                  </p>
                  <p className="mt-2 break-all text-xs text-muted-foreground">
                    ID Supabase : {profile.id}
                  </p>
                  <ApprovalRequestActions profileId={profile.id} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="soft-panel p-5 text-muted-foreground">
              Aucune demande en attente.
            </p>
          )}
        </section>

        <section aria-labelledby="history-heading" className="mt-10">
          <h2 className="mb-4 text-xl font-semibold" id="history-heading">
            Historique récent
          </h2>
          {eventsResult.data.length ? (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card px-5">
              {eventsResult.data.map((event) => (
                <li className="py-4 text-sm" key={event.id}>
                  <p>
                    <span className="font-semibold">
                      {emails.get(event.profile_id) ?? "Compte supprimé"}
                    </span>{" "}
                    —{" "}
                    {event.event_type === "requested"
                      ? "demande créée"
                      : event.event_type === "approved"
                        ? "compte approuvé"
                        : "demande refusée"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {new Date(event.created_at).toLocaleString("fr-FR")}
                    {event.actor_id
                      ? ` · par ${emails.get(event.actor_id) ?? "administrateur"}`
                      : ""}
                  </p>
                  {event.comment ? (
                    <p className="mt-2 text-muted-foreground">
                      {event.comment}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="soft-panel p-5 text-muted-foreground">
              Aucun événement enregistré.
            </p>
          )}
        </section>

        <Link
          className="mt-8 inline-block text-sm font-semibold text-primary hover:underline"
          href="/dashboard"
        >
          Retour à l’application
        </Link>
      </div>
    </main>
  );
}
