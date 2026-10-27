import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function UpdatePasswordPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/forgot-password");
  }

  return (
    <AuthShell
      title="Choisir un nouveau mot de passe"
      description="Choisissez un mot de passe robuste d’au moins 8 caractères."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
