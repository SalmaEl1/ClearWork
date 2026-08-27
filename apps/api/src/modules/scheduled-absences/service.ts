import type { ScheduledAbsenceDTO } from "@clearwork/shared";
import { ForbiddenError, NotFoundError } from "../../shared/errors.js";
import * as repo from "./repository.js";
import type { ScheduledAbsenceRow } from "./repository.js";

function toDTO(row: ScheduledAbsenceRow): ScheduledAbsenceDTO {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    reason: row.reason,
    createdAt: row.created_at.toISOString(),
  };
}

export async function createScheduledAbsence(
  userId: string,
  input: { date: string; startTime: string; endTime: string; reason: string },
): Promise<ScheduledAbsenceDTO> {
  const row = await repo.insertScheduledAbsence({ userId, ...input });
  return toDTO(row);
}

export async function listMyScheduledAbsences(userId: string): Promise<ScheduledAbsenceDTO[]> {
  const rows = await repo.listScheduledAbsencesForUser(userId);
  return rows.map(toDTO);
}

export async function deleteOwnScheduledAbsence(userId: string, id: string): Promise<void> {
  const absence = await repo.findScheduledAbsenceById(id);
  if (!absence) throw new NotFoundError("Ausencia no encontrada");
  if (absence.user_id !== userId) throw new ForbiddenError();

  await repo.deleteScheduledAbsenceById(id);
}
