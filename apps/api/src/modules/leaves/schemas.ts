import { z } from "zod";
import { LEAVE_TYPES } from "@clearwork/shared";

export const createLeaveSchema = z
  .object({
    userId: z.string().uuid("userId debe ser un UUID válido"),
    type: z.enum(LEAVE_TYPES),
    startDate: z.string().date("startDate debe tener formato AAAA-MM-DD"),
    endDate: z.string().date("endDate debe tener formato AAAA-MM-DD").nullish(),
  })
  .refine((body) => !body.endDate || body.endDate >= body.startDate, {
    message: "endDate no puede ser anterior a startDate",
    path: ["endDate"],
  });

export const listLeavesQuerySchema = z.object({
  userId: z.string().uuid("userId debe ser un UUID válido"),
});
