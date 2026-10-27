"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Home, Plus, UserRound } from "lucide-react";

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
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link className="font-semibold tracking-tight" href="/dashboard">
          Calorie Tracker AI
        </Link>
        <Link
          aria-current={isActive("/profile") ? "page" : undefined}
          aria-label="Profil"
          className={`flex size-11 items-center justify-center rounded-full transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:hidden ${isActive("/profile") ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
          href="/profile"
        >
          <UserRound aria-hidden="true" className="size-5" />
        </Link>
        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-1 sm:flex"
        >
          {navigation.map((item) => (
            <Link
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${isActive(item.href) ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
          <Link
            aria-current={isActive("/settings") ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${isActive("/settings") ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
            href="/settings"
          >
            Objectifs
          </Link>
          <Link
            aria-current={isActive("/profile") ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${isActive("/profile") ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
            href="/profile"
          >
            Profil
          </Link>
        </nav>
      </div>
      <nav
        aria-label="Navigation mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${active ? "text-primary" : "text-muted-foreground"}`}
                href={item.href}
                key={item.href}
              >
                <Icon
                  aria-hidden="true"
                  className={`size-5 ${item.href === "/meal/new" ? "rounded-full bg-primary p-0.5 text-primary-foreground" : ""}`}
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
