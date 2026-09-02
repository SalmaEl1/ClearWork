import type { NotificationChannel, NotificationType } from "@clearwork/shared";
import { pool } from "../../db/pool.js";

export type NotificationPreferenceRow = {
  user_id: string;
  notification_type: NotificationType;
  channel: NotificationChannel;
};

/** Solo las que la persona ha tocado alguna vez — el resto se completa
 * con DEFAULT_NOTIFICATION_CHANNEL en el servicio, no aquí. */
export async function listPreferencesForUser(userId: string): Promise<NotificationPreferenceRow[]> {
  const result = await pool.query<NotificationPreferenceRow>(
    "SELECT user_id, notification_type, channel FROM notification_preferences WHERE user_id = $1",
    [userId],
  );
  return result.rows;
}

/** Una sola preferencia, para cuando notify() (api/src/shared/notifications.ts)
 * necesita decidir el canal de una notificación sin traer todas las de
 * esa persona. */
export async function findPreference(
  userId: string,
  type: NotificationType,
): Promise<NotificationPreferenceRow | null> {
  const result = await pool.query<NotificationPreferenceRow>(
    "SELECT user_id, notification_type, channel FROM notification_preferences WHERE user_id = $1 AND notification_type = $2",
    [userId, type],
  );
  return result.rows[0] ?? null;
}

export async function upsertPreference(
  userId: string,
  type: NotificationType,
  channel: NotificationChannel,
): Promise<NotificationPreferenceRow> {
  const result = await pool.query<NotificationPreferenceRow>(
    `INSERT INTO notification_preferences (user_id, notification_type, channel)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, notification_type)
     DO UPDATE SET channel = EXCLUDED.channel, updated_at = now()
     RETURNING user_id, notification_type, channel`,
    [userId, type, channel],
  );
  const row = result.rows[0];
  if (!row) throw new Error("UPSERT de notification_preferences no devolvió ninguna fila");
  return row;
}
