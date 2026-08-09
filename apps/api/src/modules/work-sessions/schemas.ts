import { z } from "zod";
import { BREAK_TYPES } from "@clearwork/shared";

export const startBreakSchema = z.object({
  type: z.enum(BREAK_TYPES),
});

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(90).default(30),
});
