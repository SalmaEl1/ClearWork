import type { VacationStatus } from "@clearwork/shared";
import { pool } from "../../db/pool.js";

export type VacationRequestRow = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  status: VacationStatus;
  decided_by: string | null;
  decided_at: Date | null;
  created_at: Date;
};

export async function insertVacationRequest(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<VacationRequestRow> {
  const result = await pool.query<VacationRequestRow>(
    `INSERT INTO vacation_requests (user_id, start_date, end_date)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, startDate, endDate],
  );
  return result.rows[0]!;
}

export async function findVacationRequestById(id: string): Promise<VacationRequestRow | null> {
  const result = await pool.query<VacationRequestRow>(
    "SELECT * FROM vacation_requests WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listVacationRequestsForUser(userId: string): Promise<VacationRequestRow[]> {
  const result = await pool.query<VacationRequestRow>(
    "SELECT * FROM vacation_requests WHERE user_id = $1 ORDER BY start_date DESC",
    [userId],
  );
  return result.rows;
}

/** Para el supervisor: todas las solicitudes de quienes están hoy en su
 * equipo (no solo las pendientes, para que también vea el historial de
 * decisiones ya tomadas). */
export async function listVacationRequestsForUsers(
  userIds: string[],
): Promise<VacationRequestRow[]> {
  if (userIds.length === 0) return [];
  const result = await pool.query<VacationRequestRow>(
    "SELECT * FROM vacation_requests WHERE user_id = ANY($1) ORDER BY start_date DESC",
    [userIds],
  );
  return result.rows;
}

export async function updateVacationStatus(
  id: string,
  status: VacationStatus,
  decidedBy: string | null,
): Promise<VacationRequestRow | null> {
  const result = await pool.query<VacationRequestRow>(
    `UPDATE vacation_requests
     SET status = $2, decided_by = $3::uuid, decided_at = CASE WHEN $3::uuid IS NULL THEN NULL ELSE now() END
     WHERE id = $1
     RETURNING *`,
    [id, status, decidedBy],
  );
  return result.rows[0] ?? null;
}

/** En vigor en `onDate`, y ya aprobada: mismo criterio que
 * leaves/repository.ts's findActiveLeavesForUsers, en lote por equipo. */
export async function findActiveApprovedVacationsForUsers(
  userIds: string[],
  onDate: string,
): Promise<VacationRequestRow[]> {
  if (userIds.length === 0) return [];
  const result = await pool.query<VacationRequestRow>(
    `SELECT * FROM vacation_requests
     WHERE user_id = ANY($1) AND status = 'approved' AND start_date <= $2 AND end_date >= $2`,
    [userIds, onDate],
  );
  return result.rows;
}
