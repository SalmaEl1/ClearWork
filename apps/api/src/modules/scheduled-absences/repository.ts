import { pool } from "../../db/pool.js";

export type ScheduledAbsenceRow = {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
  created_at: Date;
};

export type CreateScheduledAbsenceInput = {
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
};

export async function insertScheduledAbsence(
  input: CreateScheduledAbsenceInput,
): Promise<ScheduledAbsenceRow> {
  const result = await pool.query<ScheduledAbsenceRow>(
    `INSERT INTO scheduled_absences (user_id, date, start_time, end_time, reason)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.userId, input.date, input.startTime, input.endTime, input.reason],
  );
  return result.rows[0]!;
}

export async function listScheduledAbsencesForUser(userId: string): Promise<ScheduledAbsenceRow[]> {
  const result = await pool.query<ScheduledAbsenceRow>(
    "SELECT * FROM scheduled_absences WHERE user_id = $1 ORDER BY date DESC, start_time DESC",
    [userId],
  );
  return result.rows;
}

/** Para /scheduled-absences/team: todas las de un equipo a la vez, no
 * una consulta por persona — mismo criterio que leaves/repository.ts's
 * findActiveLeavesForUsers. */
export async function listScheduledAbsencesForUsers(userIds: string[]): Promise<ScheduledAbsenceRow[]> {
  if (userIds.length === 0) return [];
  const result = await pool.query<ScheduledAbsenceRow>(
    "SELECT * FROM scheduled_absences WHERE user_id = ANY($1) ORDER BY date DESC, start_time DESC",
    [userIds],
  );
  return result.rows;
}

export async function findScheduledAbsenceById(id: string): Promise<ScheduledAbsenceRow | null> {
  const result = await pool.query<ScheduledAbsenceRow>(
    "SELECT * FROM scheduled_absences WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}

export async function deleteScheduledAbsenceById(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM scheduled_absences WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export type UpdateScheduledAbsenceFields = {
  date?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
};

/** Solo el supervisor edita una ausencia ya creada (issue: puede
 * ver y modificarlas, en el pasado o el futuro) — el UPDATE se construye
 * a mano, igual que en projects/repository.ts, porque el conjunto de
 * columnas editables es pequeño y fijo. */
export async function updateScheduledAbsenceById(
  id: string,
  fields: UpdateScheduledAbsenceFields,
): Promise<ScheduledAbsenceRow | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [id];

  if (fields.date !== undefined) {
    values.push(fields.date);
    setClauses.push(`date = $${values.length}`);
  }
  if (fields.startTime !== undefined) {
    values.push(fields.startTime);
    setClauses.push(`start_time = $${values.length}`);
  }
  if (fields.endTime !== undefined) {
    values.push(fields.endTime);
    setClauses.push(`end_time = $${values.length}`);
  }
  if (fields.reason !== undefined) {
    values.push(fields.reason);
    setClauses.push(`reason = $${values.length}`);
  }

  if (setClauses.length === 0) {
    return findScheduledAbsenceById(id);
  }

  const result = await pool.query<ScheduledAbsenceRow>(
    `UPDATE scheduled_absences SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

/** En vigor ahora mismo (misma fecha, hora entre inicio y fin), en lote
 * por equipo — mismo criterio que leaves/repository.ts. */
export async function findActiveScheduledAbsencesForUsers(
  userIds: string[],
  onDate: string,
  atTime: string,
): Promise<ScheduledAbsenceRow[]> {
  if (userIds.length === 0) return [];
  const result = await pool.query<ScheduledAbsenceRow>(
    `SELECT * FROM scheduled_absences
     WHERE user_id = ANY($1) AND date = $2 AND start_time <= $3 AND end_time > $3`,
    [userIds, onDate, atTime],
  );
  return result.rows;
}
