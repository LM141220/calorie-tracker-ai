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
          Les pages de compte et les données personnelles nécessitent une
          connexion. Reconnectez-vous pour continuer.
        </p>
      </section>
    </main>
  );
}
