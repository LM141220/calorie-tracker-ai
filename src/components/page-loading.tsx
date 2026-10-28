type PageLoadingProps = {
  variant: "dashboard" | "list" | "editor" | "detail" | "settings";
};

function Skeleton({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl bg-muted ${className}`}
    />
  );
}

export function PageLoading({ variant }: PageLoadingProps) {
  return (
    <main
      aria-busy="true"
      aria-label="Chargement de la page"
      className="min-h-screen bg-background"
    >
      <header className="h-[4.25rem] border-b border-border/60 px-5 py-3">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="size-10 rounded-full sm:hidden" />
          <Skeleton className="hidden h-9 w-60 rounded-full sm:block" />
        </div>
      </header>
      <div
        className={`mx-auto w-full px-5 py-7 pb-32 sm:px-6 sm:py-10 sm:pb-12 ${
          variant === "settings"
            ? "max-w-2xl"
            : variant === "detail"
              ? "max-w-2xl"
              : variant === "list"
                ? "max-w-2xl"
                : "max-w-3xl"
        }`}
      >
        <Skeleton className="mb-3 h-3 w-24 rounded-full" />
        <Skeleton className="mb-7 h-9 w-52 rounded-xl" />

        {variant === "dashboard" ? (
          <>
            <Skeleton className="h-72 rounded-[2rem]" />
            <div className="mt-4 flex justify-between">
              <Skeleton className="h-11 w-36 rounded-full" />
              <Skeleton className="h-11 w-36 rounded-full" />
            </div>
            <Skeleton className="mt-5 h-16" />
          </>
        ) : null}

        {variant === "list" ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="flex items-center gap-4 py-2" key={index}>
                <Skeleton className="size-[4.25rem] shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3 rounded-full" />
                  <Skeleton className="h-3 w-1/3 rounded-full" />
                </div>
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : null}

        {variant === "editor" ? (
          <div className="space-y-4">
            <Skeleton className="h-24 rounded-[1.5rem]" />
            <Skeleton className="h-40 rounded-[1.5rem]" />
            <Skeleton className="h-64 rounded-[1.5rem]" />
          </div>
        ) : null}

        {variant === "detail" ? (
          <>
            <Skeleton className="aspect-[4/3] max-h-[28rem]" />
            <Skeleton className="mt-5 h-24" />
            <Skeleton className="mt-5 h-56" />
          </>
        ) : null}

        {variant === "settings" ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-14 w-40 rounded-full" />
          </div>
        ) : null}
      </div>
    </main>
  );
}
