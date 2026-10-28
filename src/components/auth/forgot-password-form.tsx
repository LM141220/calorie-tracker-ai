"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { requestPasswordResetAction } from "@/features/auth/actions";
import { forgotPasswordSchema } from "@/validators/auth";
import { Button } from "@/components/ui/button";

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setMessage("");
    startTransition(async () => {
      const result = await requestPasswordResetAction(values);
      setMessage(result.message);
      setSuccess(result.success);
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

        {message ? (
          <p
            className={`text-sm ${success ? "text-primary" : "text-destructive"}`}
            role={success ? "status" : "alert"}
          >
            {message}
          </p>
        ) : null}

        <Button className="w-full" type="submit" disabled={isPending}>
          {isPending ? "Envoi…" : "Envoyer le lien"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Vous vous souvenez de votre mot de passe ?{" "}
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
