import type { PublicUser, Role } from "@clearwork/shared";
import { pool } from "../../db/pool.js";
import type { UserRow } from "./types.js";

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    supervisorId: row.supervisor_id,
    weeklyTargetHours: Number(row.weekly_target_hours),
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

export async function listWorkersForSupervisor(supervisorId: string): Promise<UserRow[]> {
  const result = await pool.query<UserRow>(
    "SELECT * FROM users WHERE supervisor_id = $1 AND role = 'worker' ORDER BY full_name ASC",
    [supervisorId],
  );
  return result.rows;
}

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  supervisorId: string | null;
};

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (email, password_hash, full_name, role, supervisor_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.email, input.passwordHash, input.fullName, input.role, input.supervisorId],
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
