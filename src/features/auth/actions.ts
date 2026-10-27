"use server";

import { redirect } from "next/navigation";

import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  updatePasswordSchema,
} from "@/validators/auth";
import { getAppUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthActionResult = {
  success: boolean;
  message: string;
  redirectTo?: string;
};

export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Informations invalides.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      success: false,
      message:
        "Connexion impossible. Vérifiez vos identifiants puis réessayez.",
    };
  }

  return {
    success: true,
    message: "Connexion réussie.",
    redirectTo: "/dashboard",
  };
}

export async function registerAction(input: {
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Informations invalides.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return {
      success: false,
      message:
        "Création du compte impossible. Vérifiez les informations saisies.",
    };
  }

  if (!data.session) {
    return {
      success: true,
      message:
        "Compte créé. Consultez votre e-mail pour confirmer votre inscription.",
    };
  }

  return {
    success: true,
    message: "Compte créé avec succès.",
    redirectTo: "/dashboard",
  };
}

export async function requestPasswordResetAction(input: {
  email: string;
}): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Adresse e-mail invalide.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${getAppUrl()}/auth/callback?next=/auth/update-password`,
    },
  );

  if (error) {
    return {
      success: false,
      message:
        "Impossible d’envoyer l’e-mail de réinitialisation. Réessayez plus tard.",
    };
  }

  return {
    success: true,
    message:
      "Si un compte correspond à cette adresse, un lien de réinitialisation vient de vous être envoyé.",
  };
}

export async function updatePasswordAction(input: {
  password: string;
  confirmPassword: string;
}): Promise<AuthActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Mot de passe invalide.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error: userError } = await supabase.auth.getUser();

  if (userError || !data.user) {
    return {
      success: false,
      message:
        "Votre session de réinitialisation a expiré. Demandez un nouveau lien.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      success: false,
      message: "La mise à jour du mot de passe a échoué. Réessayez.",
    };
  }

  return { success: true, message: "Mot de passe modifié avec succès." };
}

export async function googleSignInAction(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getAppUrl()}/auth/callback?next=/dashboard`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth");
  }

  redirect(data.url);
}

export async function logoutAction(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    redirect("/dashboard?error=logout");
  }

  redirect("/login");
}
