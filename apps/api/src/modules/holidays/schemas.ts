import { z } from "zod";

export const createHolidaySchema = z.object({
  date: z.string().date("date debe tener formato AAAA-MM-DD"),
  label: z.string().trim().min(1, "La etiqueta es obligatoria"),
});

export const listHolidaysQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
});
