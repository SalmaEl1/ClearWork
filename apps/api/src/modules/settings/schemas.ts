import { z } from "zod";

export const updateSettingsSchema = z.object({
  defaultWeeklyTargetHours: z.coerce.number().positive(),
  excludeWeekendsFromVacationDays: z.boolean().optional(),
  officeSeatCount: z.coerce.number().int().positive().optional(),
});
