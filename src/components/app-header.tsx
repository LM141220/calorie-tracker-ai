import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { InstallPrompt } from "@/components/pwa/install-prompt";

type AppHeaderProps = {
  email: string;
};

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/history", label: "Historique" },
  { href: "/settings", label: "Objectifs" },
];

export function AppHeader({ email }: AppHeaderProps) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link className="font-semibold tracking-tight" href="/dashboard">
          Calorie Tracker AI
        </Link>
        <nav
          aria-label="Navigation principale"
          className="flex items-center gap-1"
        >
          {navigation.map((item) => (
            <Link
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <InstallPrompt />
          <span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:inline">
            {email}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
