import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  description: z.string().trim().min(1).nullish(),
  supervisorId: z.string().uuid("supervisorId debe ser un UUID válido"),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    description: z.string().trim().min(1).nullish(),
    isArchived: z.boolean().optional(),
    supervisorId: z.string().uuid().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "No se ha indicado ningún campo para actualizar",
  });

export const assignMemberSchema = z.object({
  userId: z.string().uuid("userId debe ser un UUID válido"),
});

/** Igual que updateProjectSchema, pero sin isArchived ni supervisorId:
 * el supervisor edita sus propios proyectos, pero no puede archivarlos
 * ni reasignar quién los lleva (eso sigue siendo cosa del admin). */
export const updateMyProjectSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    description: z.string().trim().min(1).nullish(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "No se ha indicado ningún campo para actualizar",
  });

/** "archived" llega como string en la query ("true"/"false"); se traduce
 * a boolean aquí. Sin valor -> sin filtrar por archivado. */
export const listProjectsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  archived: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(1000).default(20),
});

export const exportProjectsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  archived: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
