import type {
  NotificationChannel,
  NotificationPreferenceDTO,
  NotificationType,
  Role,
} from "@clearwork/shared";
import { DEFAULT_NOTIFICATION_CHANNEL, NOTIFICATION_TYPES_BY_ROLE } from "@clearwork/shared";
import { ForbiddenError } from "../../shared/errors.js";
import * as repo from "./repository.js";

/** Una fila por cada tipo relevante para el rol de quien pregunta
 * (NOTIFICATION_TYPES_BY_ROLE, issue #131 — antes eran los 11 tipos por
 * igual para los tres roles), siempre presente aunque no la haya tocado
 * nunca: para la pantalla de ajustes (issue #112) no hay diferencia
 * visible entre "no elegida todavía" y "elegida el valor por defecto". */
export async function listPreferences(userId: string, role: Role): Promise<NotificationPreferenceDTO[]> {
  const rows = await repo.listPreferencesForUser(userId);
  const overrides = new Map(rows.map((r) => [r.notification_type, r.channel]));

  return NOTIFICATION_TYPES_BY_ROLE[role].map((type) => ({
    type,
    channel: overrides.get(type) ?? DEFAULT_NOTIFICATION_CHANNEL[type],
  }));
}

export async function updatePreference(
  userId: string,
  role: Role,
  type: NotificationType,
  channel: NotificationChannel,
): Promise<NotificationPreferenceDTO> {
  if (!NOTIFICATION_TYPES_BY_ROLE[role].includes(type)) {
    throw new ForbiddenError("Ese tipo de notificación no aplica a tu rol");
  }
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
