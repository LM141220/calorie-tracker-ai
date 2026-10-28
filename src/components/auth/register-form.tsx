"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { registerAction } from "@/features/auth/actions";
import { registerSchema } from "@/validators/auth";
import { Button } from "@/components/ui/button";

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setMessage("");
    startTransition(async () => {
      const result = await registerAction(values);
      setMessage(result.message);
      setSuccess(result.success);

      if (result.success && result.redirectTo) {
        router.replace(result.redirectTo);
        router.refresh();
      }
    });
  });

  return (
    <div className="space-y-5">
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div>
          <label className="mb-1.5 block text-sm font-medium" htmlFor="email">
            Adresse e-mail
          </label>
          <input
            autoComplete="email"
            className="field-premium"
            id="email"
            type="email"
            {...register("email")}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email ? (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {errors.email.message}
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            htmlFor="password"
          >
            Mot de passe
          </label>
          <input
            autoComplete="new-password"
            className="field-premium"
            id="password"
            type="password"
            {...register("password")}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password ? (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium"
            htmlFor="confirmPassword"
          >
            Confirmer le mot de passe
          </label>
          <input
            autoComplete="new-password"
            className="field-premium"
            id="confirmPassword"
            type="password"
            {...register("confirmPassword")}
            aria-invalid={Boolean(errors.confirmPassword)}
          />
          {errors.confirmPassword ? (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        {message ? (
          <p
            className={`text-sm ${success ? "text-primary" : "text-destructive"}`}
            role={success ? "status" : "alert"}
          >
            {message}
          </p>
        ) : null}

        <Button className="w-full" type="submit" disabled={isPending}>
          {isPending ? "Création du compte…" : "Créer mon compte"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link
          className="font-medium text-primary hover:underline"
          href="/login"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
