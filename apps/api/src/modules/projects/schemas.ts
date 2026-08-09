import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  description: z.string().trim().min(1).nullish(),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio").optional(),
    description: z.string().trim().min(1).nullish(),
    isArchived: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "No se ha indicado ningún campo para actualizar",
  });
