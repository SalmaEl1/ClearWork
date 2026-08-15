import bcrypt from "bcryptjs";
import type { Role } from "@clearwork/shared";
import { ConflictError } from "../../shared/errors.js";
import { generatePassword } from "../../shared/password.js";
import { createUser, findUserByEmail, updateUserPassword } from "./repository.js";
import type { UserRow } from "./types.js";

const BCRYPT_ROUNDS = 12;

export type CreateAccountInput = {
  email: string;
  /** Si no se da, se genera una y se devuelve en el resultado (ver
   * admin/service.ts, que la manda por correo). El script de arranque
   * (db/seedAdmin.ts) sí pasa una explícita. */
  password?: string;
  fullName: string;
  role: Role;
  weeklyTargetHours?: number;
};

export type CreateAccountResult = {
  user: UserRow;
  /** La contraseña en claro, solo si se generó aquí; null si vino dada. */
  generatedPassword: string | null;
};

/**
 * Lógica de creación de cuenta reutilizada por el panel de admin
 * (modules/admin) y por el script de arranque que crea el primer admin
 * (db/seedAdmin.ts), para no duplicar la comprobación de email único ni
 * el hash de contraseña en dos sitios.
 */
export async function createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new ConflictError("Ya existe una cuenta con ese email");
  }

  const generatedPassword = input.password ? null : generatePassword();
  const passwordHash = await bcrypt.hash(input.password ?? generatedPassword!, BCRYPT_ROUNDS);

  const user = await createUser({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
    role: input.role,
    weeklyTargetHours: input.weeklyTargetHours,
  });

  return { user, generatedPassword };
}

/**
 * Genera una contraseña provisional nueva para una cuenta ya existente y
 * la guarda, invalidando la anterior. No guardamos nunca la contraseña
 * en claro, así que "reenviar el correo de bienvenida" es, en realidad,
 * "emitir una contraseña nueva y mandarla" — se lo deja claro al admin
 * en el frontend antes de confirmarlo.
 */
export async function regeneratePassword(userId: string): Promise<string> {
  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await updateUserPassword(userId, passwordHash);
  return password;
}
