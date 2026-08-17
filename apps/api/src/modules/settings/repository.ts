import { pool } from "../../db/pool.js";
import type { AppSettingsRow } from "./types.js";

/** Siempre hay exactamente una fila (ver migración 006_app_settings.sql). */
export async function getSettingsRow(): Promise<AppSettingsRow> {
  const result = await pool.query<AppSettingsRow>("SELECT * FROM app_settings WHERE id = TRUE");
  const row = result.rows[0];
  if (!row) throw new Error("app_settings no tiene ninguna fila: falta aplicar la migración 006");
  return row;
}

export async function updateSettingsRow(
  defaultWeeklyTargetHours: number,
): Promise<AppSettingsRow> {
  const result = await pool.query<AppSettingsRow>(
    `UPDATE app_settings
     SET default_weekly_target_hours = $1, updated_at = now()
     WHERE id = TRUE
     RETURNING *`,
    [defaultWeeklyTargetHours],
  );
  const row = result.rows[0];
  if (!row) throw new Error("app_settings no tiene ninguna fila: falta aplicar la migración 006");
  return row;
}
