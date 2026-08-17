import { z } from "zod";
import { ACTIVITY_EVENT_TYPES, ADMIN_CREATABLE_ROLES } from "@clearwork/shared";

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  fullName: z.string().trim().min(1, "El nombre es obligatorio"),
  role: z.enum(ADMIN_CREATABLE_ROLES),
  weeklyTargetHours: z.coerce.number().positive().optional(),
});

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    email: z.string().trim().toLowerCase().email("Email inválido").optional(),
    role: z.enum(ADMIN_CREATABLE_ROLES).optional(),
    weeklyTargetHours: z.coerce.number().positive().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "No se ha indicado ningún campo para actualizar",
  });

/** Igual límite de tamaño de página en usuarios y proyectos (ver
 * projects/schemas.ts): 100 es de sobra para paginar de verdad, y basta
 * para que las pantallas que necesitan "todo" (desplegables, cifras del
 * home) pidan una sola página sin tener que paginar ellas también. */
export const listUsersQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  role: z.enum(ADMIN_CREATABLE_ROLES).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20),
});

/** Sin paginar: la exportación siempre trae todo lo que coincide con el
 * filtro, nunca solo la página que se estuviera viendo. */
export const exportUsersQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  role: z.enum(ADMIN_CREATABLE_ROLES).optional(),
});

export const listActivityQuerySchema = z.object({
  type: z.enum(ACTIVITY_EVENT_TYPES).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(15),
});
