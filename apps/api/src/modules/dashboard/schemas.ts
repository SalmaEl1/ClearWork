import { z } from "zod";

/** Negativo para semanas pasadas, 0 la actual; nunca en positivo — no se
 * puede consultar una semana futura. Límite de 52 para no permitir
 * consultas arbitrariamente lejanas en el pasado. */
export const dashboardQuerySchema = z.object({
  weekOffset: z.coerce.number().int().min(-52).max(0).default(0),
});
