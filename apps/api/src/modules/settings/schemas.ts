import { z } from "zod";

export const updateSettingsSchema = z.object({
  defaultWeeklyTargetHours: z.coerce.number().positive(),
});
