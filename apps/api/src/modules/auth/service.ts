import bcrypt from "bcryptjs";
import type { AuthResponse, MeResponse } from "@clearwork/shared";
import { BadRequestError, UnauthorizedError } from "../../shared/errors.js";
import { findProjectById, findActiveMembership } from "../projects/repository.js";
import {
  findUserByEmail,
  findUserById,
  toPublicUser,
  updateUserPassword,
} from "../users/repository.js";
import type { z } from "zod";
import type { changePasswordSchema, loginSchema } from "./schemas.js";
import { signToken } from "./jwt.js";

const BCRYPT_ROUNDS = 12;

type LoginInput = z.infer<typeof loginSchema>;
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

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

export async function getCurrentUser(userId: string): Promise<MeResponse> {
  const user = await findUserById(userId);
  if (!user) {
    throw new UnauthorizedError("El usuario del token ya no existe");
  }

  // El supervisor de un teletrabajador se deriva de su membresía activa
  // en un proyecto, no de un campo propio: ver migración 005 y
  // projects/repository.ts.
  let supervisorName: string | null = null;
  if (user.role === "worker") {
    const membership = await findActiveMembership(userId);
    if (membership) {
      const project = await findProjectById(membership.project_id);
      const supervisor = project ? await findUserById(project.supervisor_id) : null;
      supervisorName = supervisor?.full_name ?? null;
    }
  }

  return { ...toPublicUser(user), supervisorName };
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await findUserById(userId);
  if (!user) {
    throw new UnauthorizedError("El usuario del token ya no existe");
  }

  const currentMatches = await bcrypt.compare(input.currentPassword, user.password_hash);
  if (!currentMatches) {
    throw new BadRequestError("La contraseña actual no es correcta");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  await updateUserPassword(userId, passwordHash);
}
