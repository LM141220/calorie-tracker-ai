import Link from "next/link";
import type { ReactNode } from "react";

import { Leaf } from "lucide-react";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          className="mb-8 flex items-center justify-center gap-3"
          href="/"
          aria-label="Calorie Tracker AI, accueil"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf aria-hidden="true" className="size-5" />
          </span>
          <span className="font-semibold tracking-tight">
            Calorie Tracker AI
          </span>
        </Link>

        <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
