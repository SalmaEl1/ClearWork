import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, z } from "zod";

/**
 * Valida req.body contra un esquema Zod y sustituye req.body por el
 * resultado parseado (con los valores por defecto y las transformaciones
 * del esquema ya aplicadas). Si falla, lanza ZodError y lo recoge el
 * errorHandler.
 */
export function validateBody<Schema extends ZodTypeAny>(schema: Schema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body) as z.infer<Schema>;
    next();
  };
}
