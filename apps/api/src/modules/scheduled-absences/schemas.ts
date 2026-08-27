import { z } from "zod";
import { todayDateString } from "../../shared/time.js";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createScheduledAbsenceSchema = z
  .object({
    date: z.string().date("date debe tener formato AAAA-MM-DD"),
    startTime: z.string().regex(timePattern, "startTime debe tener formato HH:MM"),
    endTime: z.string().regex(timePattern, "endTime debe tener formato HH:MM"),
    reason: z.string().trim().min(1, "El motivo es obligatorio"),
  })
  .refine((body) => body.endTime > body.startTime, {
    message: "endTime debe ser posterior a startTime",
    path: ["endTime"],
  })
  .refine((body) => body.date >= todayDateString(), {
    message: "date no puede ser anterior a hoy",
    path: ["date"],
  });
