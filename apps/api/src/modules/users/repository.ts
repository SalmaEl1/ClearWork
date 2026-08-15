import type { PublicUser, Role } from "@clearwork/shared";
import { pool } from "../../db/pool.js";
import type { UserRow } from "./types.js";

const DEFAULT_WEEKLY_TARGET_HOURS = 40;

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    weeklyTargetHours: Number(row.weekly_target_hours),
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function listUsersByRole(role: Role): Promise<UserRow[]> {
  const result = await pool.query<UserRow>(
    "SELECT * FROM users WHERE role = $1 ORDER BY full_name ASC",
    [role],
  );
  return result.rows;
}

/** Últimas cuentas creadas, para la actividad reciente del home de admin. */
export async function listRecentlyCreatedUsers(limit: number): Promise<UserRow[]> {
  const result = await pool.query<UserRow>(
    "SELECT * FROM users ORDER BY created_at DESC LIMIT $1",
    [limit],
  );
  return result.rows;
}

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  weeklyTargetHours?: number;
};

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash, full_name, role, weekly_target_hours)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.email,
      input.passwordHash,
      input.fullName,
      input.role,
      input.weeklyTargetHours ?? DEFAULT_WEEKLY_TARGET_HOURS,
    ],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("INSERT de usuario no devolvió ninguna fila");
  }
  return row;
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await pool.query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2", [
    passwordHash,
    userId,
  ]);
}

export type UpdateUserFields = {
  fullName?: string;
  email?: string;
  role?: Role;
  weeklyTargetHours?: number;
  isActive?: boolean;
};

/** Igual patrón que en projects/repository.ts: UPDATE construido a mano
 * solo con los campos presentes, sin generalizar a un builder genérico. */
export async function updateUserById(
  userId: string,
  fields: UpdateUserFields,
): Promise<UserRow | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [userId];

  if (fields.fullName !== undefined) {
    values.push(fields.fullName);
    setClauses.push(`full_name = $${values.length}`);
  }
  if (fields.email !== undefined) {
    values.push(fields.email);
    setClauses.push(`email = $${values.length}`);
  }
  if (fields.role !== undefined) {
    values.push(fields.role);
    setClauses.push(`role = $${values.length}`);
  }
  if (fields.weeklyTargetHours !== undefined) {
    values.push(fields.weeklyTargetHours);
    setClauses.push(`weekly_target_hours = $${values.length}`);
  }
  if (fields.isActive !== undefined) {
    values.push(fields.isActive);
    setClauses.push(`is_active = $${values.length}`);
  }

  if (setClauses.length === 0) {
    return findUserById(userId);
  }

  const result = await pool.query<UserRow>(
    `UPDATE users SET ${setClauses.join(", ")}, updated_at = now() WHERE id = $1 RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

/**
 * Borrado real. Puede chocar con una clave ajena ON DELETE RESTRICT (un
 * supervisor con proyectos, o cualquiera con historial de cambios de
 * estado en tareas) — el servicio traduce ese choque a un mensaje claro,
 * ver admin/service.ts.
 */
export async function deleteUserById(userId: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  return (result.rowCount ?? 0) > 0;
}
