import type { LeaveType } from "@clearwork/shared";
import { pool } from "../../db/pool.js";

export type LeaveRow = {
  id: string;
  user_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string | null;
  created_by: string;
  created_at: Date;
};

export type CreateLeaveInput = {
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string | null;
  createdBy: string;
};

export async function insertLeave(input: CreateLeaveInput): Promise<LeaveRow> {
  const result = await pool.query<LeaveRow>(
    `INSERT INTO leaves (user_id, type, start_date, end_date, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.userId, input.type, input.startDate, input.endDate, input.createdBy],
  );
  return result.rows[0]!;
}

export async function listLeavesForUser(userId: string): Promise<LeaveRow[]> {
  const result = await pool.query<LeaveRow>(
    "SELECT * FROM leaves WHERE user_id = $1 ORDER BY start_date DESC",
    [userId],
  );
  return result.rows;
}

export async function findLeaveById(id: string): Promise<LeaveRow | null> {
  const result = await pool.query<LeaveRow>("SELECT * FROM leaves WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function deleteLeaveById(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM leaves WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

/** En vigor en `onDate`: empezó ese día o antes, y no ha terminado o
 * termina ese día o después. En lote para no hacer una consulta por
 * persona al pintar el estado de todo un equipo (dashboard del
 * supervisor). Si alguien tuviera más de una en vigor a la vez (no
 * debería, pero no hay constraint que lo impida), se queda con la más
 * reciente vía DISTINCT ON. */
export async function findActiveLeavesForUsers(
  userIds: string[],
  onDate: string,
): Promise<LeaveRow[]> {
  if (userIds.length === 0) return [];
  const result = await pool.query<LeaveRow>(
    `SELECT DISTINCT ON (user_id) *
     FROM leaves
     WHERE user_id = ANY($1) AND start_date <= $2 AND (end_date IS NULL OR end_date >= $2)
     ORDER BY user_id, start_date DESC`,
    [userIds, onDate],
  );
  return result.rows;
}
