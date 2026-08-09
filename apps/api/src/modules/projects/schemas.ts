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
