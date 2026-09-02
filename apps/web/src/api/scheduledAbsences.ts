import type { CreateScheduledAbsenceInput, ScheduledAbsenceDTO } from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function createScheduledAbsence(input: CreateScheduledAbsenceInput): Promise<ScheduledAbsenceDTO> {
  return apiFetch<ScheduledAbsenceDTO>("/scheduled-absences", { method: "POST", body: input });
}

export function fetchMyScheduledAbsences(): Promise<ScheduledAbsenceDTO[]> {
  return apiFetch<ScheduledAbsenceDTO[]>("/scheduled-absences");
}

export function deleteScheduledAbsence(id: string): Promise<void> {
  return apiFetch<void>(`/scheduled-absences/${id}`, { method: "DELETE" });
}

/** Ausencias puntuales de alguien del equipo, para el supervisor. */
export function fetchTeamMemberScheduledAbsences(userId: string): Promise<ScheduledAbsenceDTO[]> {
  return apiFetch<ScheduledAbsenceDTO[]>(`/scheduled-absences/team/${userId}`);
}
