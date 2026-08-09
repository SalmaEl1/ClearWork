import type { NextFunction, Request, Response } from "express";
import type { Role } from "@clearwork/shared";
import { ForbiddenError, UnauthorizedError } from "../shared/errors.js";

/**
 * Filtro grueso por rol, a nivel de ruta. Por ejemplo: las rutas de
 * creación de fichaje exigen 'worker', así que un supervisor recibe 403
 * aunque manipule la interfaz.
 *
 * No sustituye a la comprobación de propiedad del recurso: dos usuarios
 * con el mismo rol no deben poder ver los datos del otro. Esa comprobación
 * vive en el servicio, no aquí.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      // Fallo de programación si ocurre: authorize() debe usarse siempre
      // después de authenticate() en la cadena de middlewares.
      throw new UnauthorizedError();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError();
    }

    next();
  };
}
