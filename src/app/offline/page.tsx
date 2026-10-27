import Link from "next/link";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border bg-card p-7 text-center shadow-sm">
        <p className="text-sm font-medium text-primary">Mode hors ligne</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Connexion indisponible
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Cette page n’est pas encore disponible hors ligne. Reconnectez-vous
          pour actualiser vos données ou ouvrez une page déjà consultée.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent"
            href="/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent"
            href="/history"
          >
            Historique
          </Link>
        </div>
      </section>
    </main>
  );
}
