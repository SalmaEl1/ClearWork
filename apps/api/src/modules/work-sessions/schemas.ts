import { z } from "zod";
import { BREAK_TYPES } from "@clearwork/shared";

export const startBreakSchema = z.object({
  type: z.enum(BREAK_TYPES),
});

/** taskId y description son ambos opcionales: fichar sin declarar nada
 * todavía sigue siendo válido, la tarea se puede elegir después con
 * switchTaskSchema. */
export const clockInSchema = z.object({
  taskId: z.string().uuid().nullish(),
  description: z.string().trim().min(1).nullish(),
});

export const switchTaskSchema = z.object({
  taskId: z.string().uuid().nullish(),
  description: z.string().trim().min(1).nullish(),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(90).default(30),
});
