import { z } from "zod";

/** Llega como multipart/form-data (ver upload.ts): recipientIds va como
 * un único campo de texto con un array JSON dentro, no como varios
 * campos repetidos — más simple de construir desde el frontend con
 * FormData y de validar aquí en un solo paso. */
export const createDocumentSchema = z.object({
  label: z.string().trim().min(1, "La etiqueta es obligatoria"),
  recipientIds: z
    .string()
    .transform((value, ctx) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        ctx.addIssue({ code: "custom", message: "recipientIds debe ser un array JSON de ids" });
        return z.NEVER;
      }
      if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== "string")) {
        ctx.addIssue({ code: "custom", message: "recipientIds debe ser un array JSON de strings" });
        return z.NEVER;
      }
      return parsed as string[];
    })
    .refine((ids) => ids.length > 0, "Hay que elegir al menos un destinatario"),
});
