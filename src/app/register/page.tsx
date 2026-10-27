import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Créer un compte",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Créer votre compte"
      description="Commencez à suivre vos repas et vos objectifs."
    >
      <RegisterForm />
    </AuthShell>
  );
}
