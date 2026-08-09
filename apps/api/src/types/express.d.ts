import type { AuthUser } from "../modules/auth/jwt.js";

// Amplía Request de Express para llevar el usuario autenticado, poblado
// por el middleware `authenticate`. Solo existe tras pasar por él.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
