import { notificationLink, notificationMessage } from "@clearwork/shared";
import type { NotificationEvent } from "@clearwork/shared";
import type { Pool, PoolClient } from "pg";
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { sendMail } from "../email/mailer.js";
import { notificationEmailTemplate } from "../email/templates.js";
import { getEffectiveChannel } from "../modules/notification-preferences/service.js";
import { findUserById } from "../modules/users/repository.js";

/**
 * Punto único de entrega de una notificación (issue #112): antes esta
 * función solo guardaba la fila en la plataforma, y un correo aparte —
 * fijado de antemano en el código de cada módulo — se mandaba siempre
 * para task_assigned y task_status_changed. Ahora todo pasa por aquí, y
 * el canal (dentro de la app, correo, ambos, o ninguno) lo decide la
 * preferencia de quien recibe para ese tipo de notificación
 * (notification-preferences/service.ts), con
 * DEFAULT_NOTIFICATION_CHANNEL (packages/shared) como valor de partida
 * si nunca la ha tocado — el mismo comportamiento fijo que había antes.
 *
 * Acepta opcionalmente el cliente de una transacción abierta (mismo
 * patrón que recordActivity, shared/activityLog.ts) para la parte que
 * guarda en base de datos; el correo, al ser una llamada externa, se
 * manda siempre fuera de la transacción, tenga éxito o no ese `executor`.
 */
export async function notify(
  userId: string,
  event: NotificationEvent,
  executor: Pool | PoolClient = pool,
): Promise<void> {
  const channel = await getEffectiveChannel(userId, event.type);
  if (channel === "none") return;

  if (channel === "in_app" || channel === "both") {
    const { type, ...payload } = event;
    await executor.query(
      "INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3)",
      [userId, type, JSON.stringify(payload)],
    );
  }

  if (channel === "email" || channel === "both") {
    await sendNotificationEmail(userId, event);
  }
}

/** Best-effort, igual que el resto de correos de la app (p. ej.
 * forgotPassword en auth/service.ts): un fallo de envío no debe tumbar la
 * operación que originó la notificación. */
async function sendNotificationEmail(userId: string, event: NotificationEvent): Promise<void> {
  const user = await findUserById(userId);
  if (!user) return;

  // notificationLink solo sabe construir enlaces de worker/supervisor
  // (son las dos vistas con notificaciones); un admin nunca es
  // destinatario de estos tipos hoy, pero por si acaso no hay enlace que
  // ofrecerle, no se manda el correo.
  const role = user.role;
  if (role === "admin") return;

  const message = notificationMessage(event);
  const link = notificationLink(event, role);

  try {
    await sendMail(
      user.email,
      notificationEmailTemplate({
        fullName: user.full_name,
        message,
        link: link ? `${env.APP_URL}${link}` : null,
      }),
    );
  } catch (err) {
    console.error("No se pudo enviar el correo de notificación", err);
  }
}
