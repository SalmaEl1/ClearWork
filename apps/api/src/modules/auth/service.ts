import bcrypt from "bcryptjs";
import type { AuthResponse } from "@clearwork/shared";
import { BadRequestError, ConflictError, UnauthorizedError } from "../../shared/errors.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  toPublicUser,
} from "../users/repository.js";
import type { z } from "zod";
import type { loginSchema, registerSchema } from "./schemas.js";
import { signToken } from "./jwt.js";

const BCRYPT_ROUNDS = 12;

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new ConflictError("Ya existe una cuenta con ese email");
  }

  const supervisorId = input.supervisorId ?? null;

  if (input.role === "supervisor" && supervisorId) {
    throw new BadRequestError("Un supervisor no puede tener asignado otro supervisor");
  }

  // La clave ajena no puede exigir que el usuario referenciado sea
  // supervisor; esa comprobación no la hace la base de datos, la hacemos aquí.
  if (input.role === "worker" && supervisorId) {
    const supervisor = await findUserById(supervisorId);
    if (!supervisor || supervisor.role !== "supervisor") {
      throw new BadRequestError("supervisorId debe corresponder a un usuario con rol supervisor");
    }
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await createUser({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
    role: input.role,
    supervisorId,
  });

  const publicUser = toPublicUser(user);
  const token = signToken({ id: publicUser.id, role: publicUser.role });

  return { token, user: publicUser };
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const user = await findUserByEmail(input.email);
  if (!user || !user.is_active) {
    throw new UnauthorizedError("Email o contraseña incorrectos");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password_hash);
  if (!passwordMatches) {
    throw new UnauthorizedError("Email o contraseña incorrectos");
  }

  const publicUser = toPublicUser(user);
  const token = signToken({ id: publicUser.id, role: publicUser.role });

  return { token, user: publicUser };
}

export async function getCurrentUser(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new UnauthorizedError("El usuario del token ya no existe");
  }
  return toPublicUser(user);
}
