import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Indica tu contraseña actual"),
  newPassword: z.string().min(8, "La contraseña nueva debe tener al menos 8 caracteres"),
});

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    email: z.string().trim().toLowerCase().email("Email inválido").optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "No se ha indicado ningún campo para actualizar",
  });
