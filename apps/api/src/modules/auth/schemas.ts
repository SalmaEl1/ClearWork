import { z } from "zod";
import { ROLES } from "@clearwork/shared";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  fullName: z.string().trim().min(1, "El nombre es obligatorio"),
  role: z.enum(ROLES),
  supervisorId: z.string().uuid().nullish(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Indica tu contraseña actual"),
  newPassword: z.string().min(8, "La contraseña nueva debe tener al menos 8 caracteres"),
});
