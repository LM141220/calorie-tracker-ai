import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("Veuillez saisir une adresse e-mail valide.")
  .max(254, "L’adresse e-mail est trop longue.");

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(72, "Le mot de passe ne peut pas dépasser 72 caractères.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Veuillez saisir votre mot de passe."),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });
