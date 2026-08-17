import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import type { AuthResponse, MeResponse } from "@clearwork/shared";
import { env } from "../../config/env.js";
import { sendMail } from "../../email/mailer.js";
import { passwordResetEmailTemplate } from "../../email/templates.js";
import { BadRequestError, ConflictError, UnauthorizedError } from "../../shared/errors.js";
import { findProjectById, findActiveMembership } from "../projects/repository.js";
import {
  findUserByEmail,
  findUserById,
  toPublicUser,
  updateUserById,
  updateUserPassword,
} from "../users/repository.js";
import {
  createPasswordResetToken,
  deleteUnusedPasswordResetTokensForUser,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
} from "./passwordResetRepository.js";
import type { z } from "zod";
import type {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from "./schemas.js";
import { signToken } from "./jwt.js";

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

type LoginInput = z.infer<typeof loginSchema>;
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** SHA-256, no bcrypt: el token ya es un valor aleatorio de 256 bits, no
 * una contraseña de baja entropía — no necesita (ni conviene, por coste)
 * un hash lento, y se busca por igualdad exacta en la base de datos. */
function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
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

export async function getCurrentUser(userId: string): Promise<MeResponse> {
  const user = await findUserById(userId);
  if (!user) {
    throw new UnauthorizedError("El usuario del token ya no existe");
  }

  // El supervisor de un trabajador se deriva de su membresía activa
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

/**
 * Autoedición de nombre/email, disponible para cualquier rol desde su
 * propio perfil. Deliberadamente no toca `role`, `isActive` ni
 * `weeklyTargetHours`: eso sigue siendo exclusivo del panel de admin
 * sobre otras cuentas, nunca sobre la propia vía este endpoint.
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<MeResponse> {
  if (input.email) {
    const existing = await findUserByEmail(input.email);
    if (existing && existing.id !== userId) {
      throw new ConflictError("Ya existe una cuenta con ese email");
    }
  }

  const updated = await updateUserById(userId, {
    fullName: input.fullName,
    email: input.email,
  });
  if (!updated) {
    throw new UnauthorizedError("El usuario del token ya no existe");
  }

  return getCurrentUser(userId);
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

  // Comparado contra el hash guardado, no contra currentPassword: así
  // detecta que "la nueva es igual a la actual" aunque currentPassword
  // no coincidiera exactamente con lo tecleado por algún motivo.
  const isSamePassword = await bcrypt.compare(input.newPassword, user.password_hash);
  if (isSamePassword) {
    throw new BadRequestError("La contraseña nueva debe ser distinta a la actual");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  await updateUserPassword(userId, passwordHash);
}

/**
 * Punto de entrada del "olvidé mi contraseña" del login. Responde igual
 * (sin lanzar) exista o no la cuenta, y también si está desactivada: que
 * este endpoint nunca sirva para averiguar qué emails están dados de
 * alta en la aplicación.
 */
export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await findUserByEmail(input.email);
  if (!user || !user.is_active) return;

  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await createPasswordResetToken(user.id, hashResetToken(token), expiresAt);

  try {
    await sendMail(
      user.email,
      passwordResetEmailTemplate({
        fullName: user.full_name,
        resetUrl: `${env.APP_URL}/reset-password?token=${token}`,
      }),
    );
  } catch (err) {
    // Mismo motivo que arriba: no se propaga el error al llamador, o un
    // fallo de envío (distinto de "no hay cuenta") delataría qué emails
    // sí existen.
    console.error("No se pudo enviar el correo de recuperación de contraseña", err);
  }
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = hashResetToken(input.token);
  const resetToken = await findValidPasswordResetToken(tokenHash);
  if (!resetToken) {
    throw new BadRequestError("El enlace no es válido o ha caducado. Pide uno nuevo.");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  await updateUserPassword(resetToken.user_id, passwordHash);
  await markPasswordResetTokenUsed(resetToken.id);
  // Cualquier otro enlace pendiente de esa persona deja de servir: ya
  // cambió la contraseña con este.
  await deleteUnusedPasswordResetTokensForUser(resetToken.user_id);
}
