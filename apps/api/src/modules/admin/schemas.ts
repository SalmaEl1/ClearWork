import { z } from "zod";
import { ADMIN_CREATABLE_ROLES } from "@clearwork/shared";

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  fullName: z.string().trim().min(1, "El nombre es obligatorio"),
  role: z.enum(ADMIN_CREATABLE_ROLES),
  weeklyTargetHours: z.coerce.number().positive().optional(),
});

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    weeklyTargetHours: z.coerce.number().positive().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "No se ha indicado ningún campo para actualizar",
  });
