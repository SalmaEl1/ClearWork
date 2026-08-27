import type { BreakType } from "@clearwork/shared";
import { pool } from "../../db/pool.js";
import type { BreakRow, TaskSegmentRow, WorkSessionRow } from "./types.js";

export async function findOpenSessionForUser(
  userId: string,
): Promise<WorkSessionRow | null> {
  const result = await pool.query<WorkSessionRow>(
    "SELECT * FROM work_sessions WHERE user_id = $1 AND ended_at IS NULL",
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function createSession(userId: string): Promise<WorkSessionRow> {
  const result = await pool.query<WorkSessionRow>(
    "INSERT INTO work_sessions (user_id) VALUES ($1) RETURNING *",
    [userId],
  );
  const row = result.rows[0];
  if (!row) throw new Error("INSERT de work_session no devolvió ninguna fila");
  return row;
}

/**
 * Cierra la jornada abierta de un usuario. El WHERE incluye user_id y
 * ended_at IS NULL: si otra petición ya la cerró entretanto, esta
 * actualización no afecta a ninguna fila y el servicio lo detecta por
 * `result.rows.length === 0`.
 */
export async function closeSession(
  userId: string,
  endedAt: Date,
): Promise<WorkSessionRow | null> {
  const result = await pool.query<WorkSessionRow>(
    `UPDATE work_sessions
     SET ended_at = $2, updated_at = now()
     WHERE user_id = $1 AND ended_at IS NULL
     RETURNING *`,
    [userId, endedAt],
  );
  return result.rows[0] ?? null;
}

export async function findOpenBreakForSession(
  workSessionId: string,
): Promise<BreakRow | null> {
  const result = await pool.query<BreakRow>(
    "SELECT * FROM breaks WHERE work_session_id = $1 AND ended_at IS NULL",
    [workSessionId],
  );
  return result.rows[0] ?? null;
}

export async function createBreak(
  workSessionId: string,
  type: BreakType,
): Promise<BreakRow> {
  const result = await pool.query<BreakRow>(
    "INSERT INTO breaks (work_session_id, type) VALUES ($1, $2) RETURNING *",
    [workSessionId, type],
  );
  const row = result.rows[0];
  if (!row) throw new Error("INSERT de break no devolvió ninguna fila");
  return row;
}

export async function closeBreak(
  workSessionId: string,
  endedAt: Date,
): Promise<BreakRow | null> {
  const result = await pool.query<BreakRow>(
    `UPDATE breaks
     SET ended_at = $2
     WHERE work_session_id = $1 AND ended_at IS NULL
     RETURNING *`,
    [workSessionId, endedAt],
  );
  return result.rows[0] ?? null;
}

export async function listBreaksForSession(workSessionId: string): Promise<BreakRow[]> {
  const result = await pool.query<BreakRow>(
    "SELECT * FROM breaks WHERE work_session_id = $1 ORDER BY started_at ASC",
    [workSessionId],
  );
  return result.rows;
}

/** Variante en lote para no hacer una consulta por jornada al listar el historial. */
export async function listBreaksForSessions(
  workSessionIds: string[],
): Promise<BreakRow[]> {
  if (workSessionIds.length === 0) return [];
  const result = await pool.query<BreakRow>(
    "SELECT * FROM breaks WHERE work_session_id = ANY($1) ORDER BY started_at ASC",
    [workSessionIds],
  );
  return result.rows;
}

export async function listSessionsForUser(
  userId: string,
  limit: number,
): Promise<WorkSessionRow[]> {
  const result = await pool.query<WorkSessionRow>(
    `SELECT * FROM work_sessions
     WHERE user_id = $1
     ORDER BY started_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return result.rows;
}

/**
 * Jornadas de un usuario que empezaron dentro de [from, to). Para el
 * cálculo semanal del dashboard. Simplificación asumida: una jornada que
 * empezó antes de `from` y sigue abierta (p. ej. fichada la noche del
 * domingo) no se cuenta en la semana siguiente; es un caso raro y se
 * documenta en vez de complicar la consulta para cubrirlo.
 */
export async function listSessionsForUserInRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<WorkSessionRow[]> {
  const result = await pool.query<WorkSessionRow>(
    `SELECT * FROM work_sessions
     WHERE user_id = $1 AND started_at >= $2 AND started_at < $3
     ORDER BY started_at ASC`,
    [userId, from, to],
  );
  return result.rows;
}

/** Variante en lote de listSessionsForUserInRange, para el equipo de un supervisor. */
export async function listSessionsForUsersInRange(
  userIds: string[],
  from: Date,
  to: Date,
): Promise<WorkSessionRow[]> {
  if (userIds.length === 0) return [];
  const result = await pool.query<WorkSessionRow>(
    `SELECT * FROM work_sessions
     WHERE user_id = ANY($1) AND started_at >= $2 AND started_at < $3
     ORDER BY started_at ASC`,
    [userIds, from, to],
  );
  return result.rows;
}

/** Jornadas abiertas ahora mismo entre varios usuarios, para el estado en vivo del equipo. */
export async function listOpenSessionsForUsers(
  userIds: string[],
): Promise<WorkSessionRow[]> {
  if (userIds.length === 0) return [];
  const result = await pool.query<WorkSessionRow>(
    "SELECT * FROM work_sessions WHERE user_id = ANY($1) AND ended_at IS NULL",
    [userIds],
  );
  return result.rows;
}

export async function findOpenSegmentForSession(
  workSessionId: string,
): Promise<TaskSegmentRow | null> {
  const result = await pool.query<TaskSegmentRow>(
    "SELECT * FROM session_task_segments WHERE work_session_id = $1 AND ended_at IS NULL",
    [workSessionId],
  );
  return result.rows[0] ?? null;
}

/** Variante en lote de findOpenSegmentForSession, para el estado en vivo
 * del equipo del supervisor (dashboard/service.ts). */
export async function findOpenSegmentsForSessions(
  workSessionIds: string[],
): Promise<TaskSegmentRow[]> {
  if (workSessionIds.length === 0) return [];
  const result = await pool.query<TaskSegmentRow>(
    "SELECT * FROM session_task_segments WHERE work_session_id = ANY($1) AND ended_at IS NULL",
    [workSessionIds],
  );
  return result.rows;
}

export async function createSegment(
  workSessionId: string,
  taskId: string | null,
  description: string | null,
): Promise<TaskSegmentRow> {
  const result = await pool.query<TaskSegmentRow>(
    `INSERT INTO session_task_segments (work_session_id, task_id, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [workSessionId, taskId, description],
  );
  const row = result.rows[0];
  if (!row) throw new Error("INSERT de session_task_segment no devolvió ninguna fila");
  return row;
}

export async function closeOpenSegment(
  workSessionId: string,
  endedAt: Date,
): Promise<TaskSegmentRow | null> {
  const result = await pool.query<TaskSegmentRow>(
    `UPDATE session_task_segments
     SET ended_at = $2
     WHERE work_session_id = $1 AND ended_at IS NULL
     RETURNING *`,
    [workSessionId, endedAt],
  );
  return result.rows[0] ?? null;
}

export async function listSegmentsForSession(workSessionId: string): Promise<TaskSegmentRow[]> {
  const result = await pool.query<TaskSegmentRow>(
    "SELECT * FROM session_task_segments WHERE work_session_id = $1 ORDER BY started_at ASC",
    [workSessionId],
  );
  return result.rows;
}

/** Variante en lote para no hacer una consulta por jornada al listar el historial. */
export async function listSegmentsForSessions(
  workSessionIds: string[],
): Promise<TaskSegmentRow[]> {
  if (workSessionIds.length === 0) return [];
  const result = await pool.query<TaskSegmentRow>(
    "SELECT * FROM session_task_segments WHERE work_session_id = ANY($1) ORDER BY started_at ASC",
    [workSessionIds],
  );
  return result.rows;
}
