import { pool } from "../../db/pool.js";

export type HolidayRow = {
  id: string;
  date: string; // DATE llega como cadena AAAA-MM-DD, ver db/pool.ts
  label: string;
  created_at: Date;
};

export async function listCustomHolidays(): Promise<HolidayRow[]> {
  const result = await pool.query<HolidayRow>("SELECT * FROM holidays ORDER BY date ASC");
  return result.rows;
}

export async function findCustomHolidayByDate(date: string): Promise<HolidayRow | null> {
  const result = await pool.query<HolidayRow>("SELECT * FROM holidays WHERE date = $1", [date]);
  return result.rows[0] ?? null;
}

export async function findCustomHolidayById(id: string): Promise<HolidayRow | null> {
  const result = await pool.query<HolidayRow>("SELECT * FROM holidays WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

export async function insertCustomHoliday(date: string, label: string): Promise<HolidayRow> {
  const result = await pool.query<HolidayRow>(
    "INSERT INTO holidays (date, label) VALUES ($1, $2) RETURNING *",
    [date, label],
  );
  return result.rows[0]!;
}

export async function deleteCustomHolidayById(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM holidays WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
