import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../modules/auth/jwt.js";
import { UnauthorizedError } from "../shared/errors.js";

const BEARER_PREFIX = "Bearer ";

/** Exige un JWT válido en la cabecera Authorization y puebla req.user. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("Authorization");

  if (!header || !header.startsWith(BEARER_PREFIX)) {
    throw new UnauthorizedError("Falta el token de autenticación");
  }

  const token = header.slice(BEARER_PREFIX.length);
  req.user = verifyToken(token);
  next();
}
