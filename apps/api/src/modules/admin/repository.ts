import { pool } from "../../db/pool.js";

export type ActivityLogRow = {
  type: string;
  payload: Record<string, unknown>;
  occurred_at: Date;
};

export type ActivityListFilters = {
  /** Uno o varios tipos a la vez (una categoría entera, p. ej. "Cuentas"
   * son sus cuatro tipos juntos) — sin ninguno, no se filtra por tipo. */
  types?: string[];
  sortOrder?: "newest" | "oldest";
  /** Solo eventos de proyectos/tareas de este supervisor (GET
   * /supervisor/activity) — comprueba los tres campos posibles según el
   * tipo de evento, ver AdminActivityEventDTO en packages/shared. Sin
   * esto, sin filtrar (feed del admin, sobre todo el mundo). */
  supervisorId?: string;
};

export type ActivityListPage = {
  rows: ActivityLogRow[];
  total: number;
};

/**
 * Lee de activity_log (ver migración 007 y shared/activityLog.ts, que es
 * quien escribe ahí). `payload` llega ya como objeto: `pg` deserializa
 * JSONB automáticamente, no hace falta un JSON.parse aparte.
 */
export async function listActivityPage(
  filters: ActivityListFilters,
  page: number,
  pageSize: number,
): Promise<ActivityListPage> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.types && filters.types.length > 0) {
    values.push(filters.types);
    conditions.push(`type = ANY($${values.length})`);
  }

  if (filters.supervisorId) {
    values.push(filters.supervisorId);
    const p = values.length;
    conditions.push(
      `(payload->>'supervisorId' = $${p} OR payload->>'fromSupervisorId' = $${p} OR payload->>'toSupervisorId' = $${p})`,
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderClause = filters.sortOrder === "oldest" ? "ORDER BY occurred_at ASC" : "ORDER BY occurred_at DESC";

  values.push(pageSize, (page - 1) * pageSize);
  const limitParam = values.length - 1;
  const offsetParam = values.length;

  const result = await pool.query<ActivityLogRow & { total_count: string }>(
    `SELECT type, payload, occurred_at, COUNT(*) OVER() AS total_count
     FROM activity_log
     ${whereClause}
     ${orderClause}
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values,
  );

  const total = result.rows.length > 0 ? Number(result.rows[0]!.total_count) : 0;
  return { rows: result.rows, total };
}
