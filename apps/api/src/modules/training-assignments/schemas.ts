import { z } from "zod";

export const createTrainingAssignmentSchema = z.object({
  trainingId: z.string().uuid("trainingId debe ser un UUID válido"),
  userId: z.string().uuid("userId debe ser un UUID válido"),
});
