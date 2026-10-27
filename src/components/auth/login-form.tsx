"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { googleSignInAction, loginAction } from "@/features/auth/actions";
import { getSafeRedirectPath } from "@/lib/auth/redirects";
import { loginSchema } from "@/validators/auth";
import { Button } from "@/components/ui/button";

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const authError = searchParams.get("error");

  const onSubmit = handleSubmit((values) => {
    setMessage("");
    startTransition(async () => {
      const result = await loginAction(values);
      setMessage(result.message);

      if (result.success && result.redirectTo) {
        const nextPath = getSafeRedirectPath(searchParams.get("next"));
        router.replace(nextPath);
        router.refresh();
      }
    });
  });

  return (
    <div className="space-y-5">
      {authError === "oauth" || authError === "auth_callback" ? (
        <p
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          La connexion avec ce fournisseur a échoué. Réessayez.
        </p>
      ) : null}
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
            Adresse e-mail
          </label>
          <input
            autoComplete="email"
            className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            id="email"
            type="email"
            {...register("email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email ? (
            <p className="mt-1 text-sm text-destructive" id="email-error">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label className="text-sm font-medium" htmlFor="password">
              Mot de passe
            </label>
            <Link
              className="text-sm text-primary hover:underline"
              href="/forgot-password"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <input
            autoComplete="current-password"
            className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            id="password"
            type="password"
            {...register("password")}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password ? (
            <p className="mt-1 text-sm text-destructive" id="password-error">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        {message ? (
          <p className="text-sm text-destructive" role="alert">
            {message}
          </p>
        ) : null}
        <Button className="w-full" type="submit" disabled={isPending}>
          {isPending ? "Connexion…" : "Se connecter"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-xs uppercase text-muted-foreground">
            ou
          </span>
        </div>
      </div>

      <form action={googleSignInAction}>
        <Button className="w-full" variant="outline" type="submit">
          Continuer avec Google
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link
          className="font-medium text-primary hover:underline"
          href="/register"
        >
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
