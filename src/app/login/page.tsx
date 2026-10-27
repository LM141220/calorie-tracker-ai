import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Connexion",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Bon retour"
      description="Connectez-vous pour retrouver votre suivi nutritionnel."
    >
      <Suspense
        fallback={
          <p className="text-center text-sm text-muted-foreground">
            Chargement…
          </p>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
