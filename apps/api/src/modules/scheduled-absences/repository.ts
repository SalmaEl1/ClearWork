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
