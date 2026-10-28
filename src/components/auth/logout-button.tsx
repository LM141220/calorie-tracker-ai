"use client";

import { useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { logoutAction } from "@/features/auth/actions";

const PRIVATE_CACHE_NAME = "calorie-tracker-ai-private-pages";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  function signOut() {
    startTransition(async () => {
      queryClient.clear();
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
      className="min-h-11 rounded-full px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      disabled={isPending}
      onClick={signOut}
      type="button"
    >
      {isPending ? "Déconnexion…" : "Déconnexion"}
    </button>
  );
}
