import type {
  CreateScheduledAbsenceInput,
  CreateTeamScheduledAbsenceInput,
  ScheduledAbsenceDTO,
  TeamScheduledAbsenceDTO,
  UpdateScheduledAbsenceInput,
} from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function createScheduledAbsence(input: CreateScheduledAbsenceInput): Promise<ScheduledAbsenceDTO> {
  return apiFetch<ScheduledAbsenceDTO>("/scheduled-absences", { method: "POST", body: input });
}

export function fetchMyScheduledAbsences(): Promise<ScheduledAbsenceDTO[]> {
  return apiFetch<ScheduledAbsenceDTO[]>("/scheduled-absences");
}

/** Compartido por worker (la suya) y supervisor (una de su equipo): el
 * servicio decide quién puede borrar cuál. */
export function deleteScheduledAbsence(id: string): Promise<void> {
  return apiFetch<void>(`/scheduled-absences/${id}`, { method: "DELETE" });
}

/** Ausencias puntuales de alguien del equipo, para el supervisor. */
export function fetchTeamMemberScheduledAbsences(userId: string): Promise<ScheduledAbsenceDTO[]> {
  return apiFetch<ScheduledAbsenceDTO[]>(`/scheduled-absences/team/${userId}`);
}

/** Las de todo el equipo a la vez, con quién es cada una — para la
 * pestaña de ausencias del supervisor. */
export function fetchTeamScheduledAbsences(): Promise<TeamScheduledAbsenceDTO[]> {
  return apiFetch<TeamScheduledAbsenceDTO[]>("/scheduled-absences/team");
}

/** El supervisor programa una ausencia en nombre de alguien de su
 * equipo, sin la restricción de "hoy o más tarde" que sí tiene el
 * autoservicio del trabajador. */
export function createTeamScheduledAbsence(
  input: CreateTeamScheduledAbsenceInput,
): Promise<ScheduledAbsenceDTO> {
  return apiFetch<ScheduledAbsenceDTO>("/scheduled-absences/team", { method: "POST", body: input });
}

/** Solo el supervisor edita una ausencia ya creada. */
export function updateScheduledAbsence(
  id: string,
  input: UpdateScheduledAbsenceInput,
): Promise<ScheduledAbsenceDTO> {
  return apiFetch<ScheduledAbsenceDTO>(`/scheduled-absences/${id}`, { method: "PATCH", body: input });
}
