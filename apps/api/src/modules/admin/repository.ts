import { pool } from "../../db/pool.js";

export type ActivityLogRow = {
  type: string;
  payload: Record<string, unknown>;
  occurred_at: Date;
};

export type ActivityListFilters = {
  type?: string;
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

  if (filters.type) {
    values.push(filters.type);
    conditions.push(`type = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  values.push(pageSize, (page - 1) * pageSize);
  const limitParam = values.length - 1;
  const offsetParam = values.length;

  const result = await pool.query<ActivityLogRow & { total_count: string }>(
    `SELECT type, payload, occurred_at, COUNT(*) OVER() AS total_count
     FROM activity_log
     ${whereClause}
     ORDER BY occurred_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values,
  );

  const total = result.rows.length > 0 ? Number(result.rows[0]!.total_count) : 0;
  return { rows: result.rows, total };
}
