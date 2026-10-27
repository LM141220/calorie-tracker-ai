"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { updatePasswordAction } from "@/features/auth/actions";
import { updatePasswordSchema } from "@/validators/auth";
import { Button } from "@/components/ui/button";

type UpdatePasswordValues = z.infer<typeof updatePasswordSchema>;

export function UpdatePasswordForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setMessage("");
    startTransition(async () => {
      const result = await updatePasswordAction(values);
      setMessage(result.message);

      if (result.success) {
        router.replace("/dashboard");
        router.refresh();
      }
    });
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="password">
          Nouveau mot de passe
        </label>
        <input
          autoComplete="new-password"
          className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
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
          className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
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
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Mise à jour…" : "Modifier le mot de passe"}
      </Button>
    </form>
  );
}
