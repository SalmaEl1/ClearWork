import { z } from "zod";
import { todayDateString } from "../../shared/time.js";

export const createVacationRequestSchema = z
  .object({
    startDate: z.string().date("startDate debe tener formato AAAA-MM-DD"),
    endDate: z.string().date("endDate debe tener formato AAAA-MM-DD"),
  })
  .refine((body) => body.endDate >= body.startDate, {
    message: "endDate no puede ser anterior a startDate",
    path: ["endDate"],
  })
  .refine((body) => body.startDate >= todayDateString(), {
    message: "startDate no puede ser anterior a hoy",
    path: ["startDate"],
  });
