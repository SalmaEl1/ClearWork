import { pool } from "../../db/pool.js";

export type SeatReservationRow = {
  id: string;
  user_id: string;
  date: string; // DATE llega como cadena AAAA-MM-DD, ver db/pool.ts
  seat_number: number;
  created_at: Date;
};

export async function listReservationsForDate(date: string): Promise<SeatReservationRow[]> {
  const result = await pool.query<SeatReservationRow>(
    "SELECT * FROM seat_reservations WHERE date = $1 ORDER BY seat_number ASC",
    [date],
  );
  return result.rows;
}

/** Todas las reservas de una persona dentro de un mes (AAAA-MM), para su
 * propia lista de "mis reservas este mes" — a diferencia de
 * listReservationsForDate, que es de un solo día y de todo el mundo. */
export async function listReservationsForUserInMonth(
  userId: string,
  month: string,
): Promise<SeatReservationRow[]> {
  const result = await pool.query<SeatReservationRow>(
    `SELECT * FROM seat_reservations
     WHERE user_id = $1 AND to_char(date, 'YYYY-MM') = $2
     ORDER BY date ASC`,
    [userId, month],
  );
  return result.rows;
}

export async function findReservationById(id: string): Promise<SeatReservationRow | null> {
  const result = await pool.query<SeatReservationRow>(
    "SELECT * FROM seat_reservations WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}

export async function findReservationForUserAndDate(
  userId: string,
  date: string,
): Promise<SeatReservationRow | null> {
  const result = await pool.query<SeatReservationRow>(
    "SELECT * FROM seat_reservations WHERE user_id = $1 AND date = $2",
    [userId, date],
  );
  return result.rows[0] ?? null;
}

export async function insertReservation(
  userId: string,
  date: string,
  seatNumber: number,
): Promise<SeatReservationRow> {
  const result = await pool.query<SeatReservationRow>(
    "INSERT INTO seat_reservations (user_id, date, seat_number) VALUES ($1, $2, $3) RETURNING *",
    [userId, date, seatNumber],
  );
  return result.rows[0]!;
}

export async function deleteReservationById(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM seat_reservations WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
