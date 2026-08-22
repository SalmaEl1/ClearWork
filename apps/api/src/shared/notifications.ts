import type { NotificationDTO } from "@clearwork/shared";
import type { Pool, PoolClient } from "pg";
import { pool } from "../db/pool.js";

/** Igual que DistributiveOmit en shared/activityLog.ts: un `Omit` normal
 * colapsaría la unión discriminada de NotificationDTO. */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/** Lo que hay que guardar de una notificación: todo NotificationDTO menos
 * lo que pone la propia base de datos (id, createdAt) o que empieza sin
 * leer (readAt: null). */
type NotificationInput = DistributiveOmit<NotificationDTO, "id" | "readAt" | "createdAt">;

/**
 * Crea una notificación para un usuario. Mismo patrón que recordActivity
 * (shared/activityLog.ts): acepta opcionalmente el cliente de una
 * transacción abierta, para que la notificación se confirme o deshaga
 * junto con el cambio que la origina.
 */
export async function notify(
  userId: string,
  event: NotificationInput,
  executor: Pool | PoolClient = pool,
): Promise<void> {
  const { type, ...payload } = event;
  await executor.query(
    "INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3)",
    [userId, type, JSON.stringify(payload)],
  );
}
