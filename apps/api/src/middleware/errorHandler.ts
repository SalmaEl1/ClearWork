import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../shared/errors.js";

/**
 * Middleware de error de Express: debe declarar los cuatro parámetros
 * (incluido `next`) aunque no se use, o Express no lo reconoce como
 * manejador de errores.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Solicitud inválida",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}
