import type { SeatAvailabilityDTO, SeatReservationDTO } from "@clearwork/shared";
import { isUniqueViolation } from "../../db/errors.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../shared/errors.js";
import { todayDateString } from "../../shared/time.js";
import { getSettings } from "../settings/service.js";
import { findUserById, findUsersByIds } from "../users/repository.js";
import * as repo from "./repository.js";
import type { SeatReservationRow } from "./repository.js";

function toDTO(row: SeatReservationRow, userFullName: string): SeatReservationDTO {
  return {
    id: row.id,
    userId: row.user_id,
    userFullName,
    date: row.date,
    seatNumber: row.seat_number,
  };
}

export async function getSeatAvailability(date: string): Promise<SeatAvailabilityDTO> {
  const [settings, rows] = await Promise.all([getSettings(), repo.listReservationsForDate(date)]);

  const users = await findUsersByIds(rows.map((r) => r.user_id));
  const nameById = new Map(users.map((u) => [u.id, u.full_name]));

  return {
    date,
    totalSeats: settings.officeSeatCount,
    reservations: rows.map((row) => toDTO(row, nameById.get(row.user_id) ?? "")),
  };
}

export async function getMyReservationsForMonth(userId: string, month: string): Promise<SeatReservationDTO[]> {
  const rows = await repo.listReservationsForUserInMonth(userId, month);
  const user = await findUserById(userId);
  return rows.map((row) => toDTO(row, user?.full_name ?? ""));
}

export async function createReservation(
  userId: string,
  input: { date: string; seatNumber: number },
): Promise<SeatReservationDTO> {
  if (input.date < todayDateString()) {
    throw new BadRequestError("No se puede reservar un asiento para un día que ya ha pasado");
  }

  const settings = await getSettings();
  if (input.seatNumber < 1 || input.seatNumber > settings.officeSeatCount) {
    throw new BadRequestError(`El número de asiento debe estar entre 1 y ${settings.officeSeatCount}`);
  }

  const ownExisting = await repo.findReservationForUserAndDate(userId, input.date);
  if (ownExisting) {
    throw new ConflictError("Ya tienes un asiento reservado ese día — cancélalo antes de reservar otro");
  }

  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("Usuario no encontrado");

  try {
    const created = await repo.insertReservation(userId, input.date, input.seatNumber);
    return toDTO(created, user.full_name);
  } catch (err) {
    // Bajo una condición de carrera real, dos personas pueden pasar la
    // comprobación anterior a la vez para el mismo asiento — el que
    // pierde choca aquí contra la restricción UNIQUE, no antes.
    if (isUniqueViolation(err)) {
      throw new ConflictError("Ese asiento ya está reservado ese día");
    }
    throw err;
  }
}

export async function cancelOwnReservation(userId: string, reservationId: string): Promise<void> {
  const reservation = await repo.findReservationById(reservationId);
  if (!reservation || reservation.user_id !== userId) {
    throw new NotFoundError("Reserva no encontrada");
  }
  if (reservation.date < todayDateString()) {
    throw new ConflictError("No se puede cancelar una reserva de un día que ya ha pasado");
  }
  await repo.deleteReservationById(reservationId);
}
