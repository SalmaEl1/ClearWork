import { pool } from "../../db/pool.js";

export type NotificationRow = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  read_at: Date | null;
  created_at: Date;
};

export type NotificationListPage = {
  rows: NotificationRow[];
  total: number;
};

/** `payload` llega ya como objeto: pg deserializa JSONB solo, igual que
 * en admin/repository.ts's listActivityPage. */
export async function listNotificationsPage(
  userId: string,
  page: number,
  pageSize: number,
): Promise<NotificationListPage> {
  const result = await pool.query<NotificationRow & { total_count: string }>(
    `SELECT id, type, payload, read_at, created_at, COUNT(*) OVER() AS total_count
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, pageSize, (page - 1) * pageSize],
  );
  const total = result.rows.length > 0 ? Number(result.rows[0]!.total_count) : 0;
  return { rows: result.rows, total };
}

export async function countUnread(userId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    "SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL",
    [userId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

/** Solo marca como leída si es del propio usuario: nadie puede marcar
 * como leída una notificación ajena solo por adivinar su id. Idempotente
 * con COALESCE: volver a marcar una ya leída no falla ni le cambia la
 * fecha, solo el "no encontrada" (ajena o inexistente) devuelve null. */
export async function markAsRead(id: string, userId: string): Promise<NotificationRow | null> {
  const result = await pool.query<NotificationRow>(
    `UPDATE notifications SET read_at = COALESCE(read_at, now())
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId],
  );
  return result.rows[0] ?? null;
}

export async function markAllAsRead(userId: string): Promise<void> {
  await pool.query(
    "UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL",
    [userId],
  );
}
