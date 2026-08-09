import bcrypt from "bcryptjs";
import type { Role } from "@clearwork/shared";
import { ConflictError } from "../../shared/errors.js";
import { createUser, findUserByEmail } from "./repository.js";
import type { UserRow } from "./types.js";

const BCRYPT_ROUNDS = 12;

export type CreateAccountInput = {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  weeklyTargetHours?: number;
};

/**
 * Lógica de creación de cuenta reutilizada por el panel de admin
 * (modules/admin) y por el script de arranque que crea el primer admin
 * (db/seedAdmin.ts), para no duplicar la comprobación de email único ni
 * el hash de contraseña en dos sitios.
 */
export async function createAccount(input: CreateAccountInput): Promise<UserRow> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new ConflictError("Ya existe una cuenta con ese email");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  return createUser({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
    role: input.role,
    weeklyTargetHours: input.weeklyTargetHours,
  });
}
