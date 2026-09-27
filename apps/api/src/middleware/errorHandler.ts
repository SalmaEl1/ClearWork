import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
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

  // multer (subida de documentos, modules/documents/upload.ts) no es un
  // AppError: sin esto, superar cualquiera de sus límites (peso del
  // archivo, número de campos...) devolvía un 500 genérico como si fuera
  // un fallo del servidor, en vez de un 400 explicando qué límite se
  // superó — el propio código ya distingue cuál (LIMIT_FILE_SIZE,
  // LIMIT_FIELD_COUNT...).
  if (err instanceof MulterError) {
    const messages: Partial<Record<MulterError["code"], string>> = {
      LIMIT_FILE_SIZE: "El archivo supera el tamaño máximo permitido",
      LIMIT_FILE_COUNT: "Solo se puede subir un archivo",
      LIMIT_FIELD_COUNT: "La solicitud trae más campos de los esperados",
      LIMIT_UNEXPECTED_FILE: "Campo de archivo inesperado",
    };
    res.status(400).json({ error: messages[err.code] ?? "No se pudo procesar el archivo subido" });
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
