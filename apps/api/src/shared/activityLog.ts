import type { AdminActivityEventDTO } from "@clearwork/shared";
import type { Pool, PoolClient } from "pg";
import { pool } from "../db/pool.js";

/** `Omit` normal no distribuye sobre una unión discriminada (colapsa
 * `keyof` a la intersección de todas las variantes); esta versión aplica
 * `Omit` a cada variante por separado, así que el resultado sigue siendo
 * una unión discriminada por `type`, no un totum revolutum. */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/**
 * Lo que hay que guardar de un evento: todo AdminActivityEventDTO menos
 * `occurredAt`, que pone la propia base de datos (`DEFAULT now()`) para
 * que el momento registrado sea el de la escritura, no el de construir
 * el objeto en memoria.
 */
type ActivityEventInput = DistributiveOmit<AdminActivityEventDTO, "occurredAt">;

/**
 * Registra un evento de actividad. Acepta opcionalmente el cliente de una
 * transacción abierta (lo usa reassignMembership, para que el "salió de"
 * y el "se incorporó a" se confirmen o deshagan junto con el propio
 * cambio de membresía); si no se pasa ninguno, usa el pool por defecto.
 */
export async function recordActivity(
  event: ActivityEventInput,
  executor: Pool | PoolClient = pool,
): Promise<void> {
  const { type, ...payload } = event;
  await executor.query("INSERT INTO activity_log (type, payload) VALUES ($1, $2)", [
    type,
    JSON.stringify(payload),
  ]);
}
