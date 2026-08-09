import jwt from "jsonwebtoken";
import type { Role } from "@clearwork/shared";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../shared/errors.js";

/**
 * Lo estrictamente necesario para autorizar una petición. El token es
 * legible por cualquiera que lo posea, así que no lleva nombre ni email:
 * esos datos se piden a GET /api/auth/me.
 */
export type AuthUser = {
  id: string;
  role: Role;
};

type JwtClaims = {
  sub: string;
  role: Role;
};

export function signToken(user: AuthUser): string {
  const claims: JwtClaims = { sub: user.id, role: user.role };
  return jwt.sign(claims, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtClaims;
    return { id: decoded.sub, role: decoded.role };
  } catch {
    throw new UnauthorizedError("Token inválido o caducado");
  }
}
