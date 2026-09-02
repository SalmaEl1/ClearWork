import type {
  NotificationChannel,
  NotificationPreferenceDTO,
  NotificationType,
} from "@clearwork/shared";
import { DEFAULT_NOTIFICATION_CHANNEL, NOTIFICATION_TYPES } from "@clearwork/shared";
import * as repo from "./repository.js";

/** Una fila por cada NotificationType, siempre — para que la pantalla de
 * ajustes (issue #112) no tenga que saber distinguir "no elegido todavía"
 * de "elegido el valor por defecto": no hay diferencia visible entre las
 * dos, así que tampoco la hay en la respuesta. */
export async function listPreferences(userId: string): Promise<NotificationPreferenceDTO[]> {
  const rows = await repo.listPreferencesForUser(userId);
  const overrides = new Map(rows.map((r) => [r.notification_type, r.channel]));

  return NOTIFICATION_TYPES.map((type) => ({
    type,
    channel: overrides.get(type) ?? DEFAULT_NOTIFICATION_CHANNEL[type],
  }));
}

export async function updatePreference(
  userId: string,
  type: NotificationType,
  channel: NotificationChannel,
): Promise<NotificationPreferenceDTO> {
  const row = await repo.upsertPreference(userId, type, channel);
  return { type: row.notification_type, channel: row.channel };
}

/** El canal efectivo de una notificación concreta, para notify()
 * (api/src/shared/notifications.ts): con fila guardada o sin ella. */
export async function getEffectiveChannel(
  userId: string,
  type: NotificationType,
): Promise<NotificationChannel> {
  const row = await repo.findPreference(userId, type);
  return row?.channel ?? DEFAULT_NOTIFICATION_CHANNEL[type];
}
