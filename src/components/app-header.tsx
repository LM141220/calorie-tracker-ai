"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, Plus, UserRound } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";

const navigation = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/history", label: "Historique", icon: History },
  { href: "/meal/new", label: "Ajouter", icon: Plus },
];

export function AppHeader() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
        <Link
          className="flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href="/dashboard"
        >
          <BrandMark className="size-9" />
          <span className="text-lg font-semibold tracking-tight">Lumo</span>
        </Link>
        <Link
          aria-current={isActive("/profile") ? "page" : undefined}
          aria-label="Profil"
          className={`flex size-11 items-center justify-center rounded-full transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden ${isActive("/profile") ? "bg-accent text-primary" : "text-muted-foreground"}`}
          href="/profile"
        >
          <UserRound aria-hidden="true" className="size-[19px]" />
        </Link>
        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-1 sm:flex"
        >
          {navigation.map((item) => (
            <Link
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${isActive(item.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
          <Link
            aria-current={isActive("/settings") ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${isActive("/settings") ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
            href="/settings"
          >
            Objectifs
          </Link>
          <Link
            aria-current={isActive("/profile") ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${isActive("/profile") ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
            href="/profile"
          >
            Profil
          </Link>
        </nav>
      </div>
      <nav
        aria-label="Navigation mobile"
        className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-2 sm:hidden"
      >
        <div className="mx-auto grid max-w-sm grid-cols-3 rounded-full bg-card/95 p-1.5 shadow-[0_8px_32px_-12px_rgba(25,35,29,0.28)] ring-1 ring-border/70 backdrop-blur-xl">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-full text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${active ? "bg-accent text-primary" : "text-muted-foreground"}`}
                href={item.href}
                key={item.href}
              >
                <Icon
                  aria-hidden="true"
                  className={`size-[19px] ${item.href === "/meal/new" ? "size-8 rounded-full bg-highlight p-1.5 text-primary" : ""}`}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
