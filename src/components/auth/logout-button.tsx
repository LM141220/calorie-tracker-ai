"use client";

import { useTransition } from "react";

import { logoutAction } from "@/features/auth/actions";

const PRIVATE_CACHE_NAME = "calorie-tracker-ai-private-pages";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      try {
        if ("caches" in window) {
          await caches.delete(PRIVATE_CACHE_NAME);
        }
      } catch (error: unknown) {
        console.error(
          "Could not clear private offline cache before logout.",
          error,
        );
      }

      await logoutAction();
    });
  }

  return (
    <button
      className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      disabled={isPending}
      onClick={signOut}
      type="button"
    >
      {isPending ? "Déconnexion…" : "Déconnexion"}
    </button>
  );
}
