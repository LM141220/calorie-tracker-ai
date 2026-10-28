import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand-mark";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <Link
          className="mb-10 flex items-center justify-center gap-3"
          href="/"
          aria-label="Lumo, accueil"
        >
          <BrandMark className="size-11" />
          <span className="text-xl font-semibold tracking-tight">Lumo</span>
        </Link>

        <section className="soft-panel p-6 sm:p-8">
          <div className="mb-7">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-base leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
