import { z } from "zod";

export const createTrainingSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio"),
});
