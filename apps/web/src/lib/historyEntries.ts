import type { LeaveDTO, ScheduledAbsenceDTO, VacationRequestDTO, WorkSessionDTO } from "@clearwork/shared";
import { LEAVE_TYPE_LABEL } from "../constants.js";

export type HistoryEntry =
  | { kind: "session"; id: string; sortDate: string; session: WorkSessionDTO }
  | { kind: "leave"; id: string; sortDate: string; label: string; startDate: string; endDate: string | null }
  | { kind: "vacation"; id: string; sortDate: string; startDate: string; endDate: string }
  | {
      kind: "absence";
      id: string;
      sortDate: string;
      date: string;
      startTime: string;
      endTime: string;
      reason: string;
    };

/**
 * Junta los fichajes con los periodos que "tapan" un día de jornada
 * normal (bajas, vacaciones aprobadas, ausencias puntuales) en una sola
 * lista ordenada por fecha descendente. Issue #101: antes esos periodos
 * solo se veían como un estado en vivo en el panel principal, y no
 * quedaba constancia en el historial de por qué un día no tiene fichaje
 * asociado.
 *
 * Se comparan como texto, no como Date: startedAt de una sesión es un
 * datetime ISO completo ("2026-08-30T09:00:00.000Z") y las fechas de
 * baja/vacación/ausencia son solo "AAAA-MM-DD" — al ser la segunda un
 * prefijo de la primera, la comparación de cadenas ya las ordena
 * correctamente sin tener que normalizar el formato.
 */
export function buildHistoryEntries(
  sessions: WorkSessionDTO[],
  leaves: LeaveDTO[],
  vacations: VacationRequestDTO[],
  absences: ScheduledAbsenceDTO[],
): HistoryEntry[] {
  const entries: HistoryEntry[] = [
    ...sessions.map((session) => ({
      kind: "session" as const,
      id: session.id,
      sortDate: session.startedAt,
      session,
    })),
    ...leaves.map((leave) => ({
      kind: "leave" as const,
      id: leave.id,
      sortDate: leave.startDate,
      label: LEAVE_TYPE_LABEL[leave.type],
      startDate: leave.startDate,
      endDate: leave.endDate,
    })),
    ...vacations
      .filter((v) => v.status === "approved")
      .map((v) => ({
        kind: "vacation" as const,
        id: v.id,
        sortDate: v.startDate,
        startDate: v.startDate,
        endDate: v.endDate,
      })),
    ...absences.map((a) => ({
      kind: "absence" as const,
      id: a.id,
      sortDate: a.date,
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
      reason: a.reason,
    })),
  ];

  return entries.sort((a, b) => (a.sortDate < b.sortDate ? 1 : a.sortDate > b.sortDate ? -1 : 0));
}
