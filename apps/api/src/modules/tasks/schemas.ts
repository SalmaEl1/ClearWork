import { z } from "zod";
import { TASK_STATUSES } from "@clearwork/shared";

export const createTaskSchema = z.object({
  projectId: z.string().uuid("projectId debe ser un UUID válido"),
  title: z.string().trim().min(1, "El título es obligatorio"),
  description: z.string().trim().min(1).nullish(),
  assigneeId: z.string().uuid().nullish(),
  dueDate: z.string().date("dueDate debe tener formato AAAA-MM-DD").nullish(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1, "El título es obligatorio").optional(),
    description: z.string().trim().min(1).nullish(),
    assigneeId: z.string().uuid().nullish(),
    dueDate: z.string().date("dueDate debe tener formato AAAA-MM-DD").nullish(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "No se ha indicado ningún campo para actualizar",
  });

export const updateTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

export const updateTaskProgressSchema = z.object({
  progressPercentage: z.coerce.number().int().min(0).max(100),
});

export const taskListQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  projectId: z.string().uuid().optional(),
});
