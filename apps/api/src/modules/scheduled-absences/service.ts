import type { ScheduledAbsenceDTO } from "@clearwork/shared";
import { ForbiddenError, NotFoundError } from "../../shared/errors.js";
import { notify } from "../../shared/notifications.js";
import { listActiveWorkersForSupervisor } from "../projects/repository.js";
import { findSupervisorIdForWorker } from "../projects/service.js";
import { findUserById } from "../users/repository.js";
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

  const supervisorId = await findSupervisorIdForWorker(userId);
  const worker = supervisorId ? await findUserById(userId) : null;
  if (supervisorId && worker) {
    await notify(supervisorId, {
      type: "absence_scheduled",
      workerName: worker.full_name,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      reason: input.reason,
    });
  }

  return toDTO(row);
}

export async function listMyScheduledAbsences(userId: string): Promise<ScheduledAbsenceDTO[]> {
  const rows = await repo.listScheduledAbsencesForUser(userId);
  return rows.map(toDTO);
}

/** Ausencias puntuales de alguien del equipo, para el historial de
 * jornada del supervisor (issue #101) — mismo criterio 404 que
 * work-sessions/service.ts para no confirmar un equipo ajeno. */
export async function listScheduledAbsencesForTeamMember(
  supervisorId: string,
  memberId: string,
): Promise<ScheduledAbsenceDTO[]> {
  const team = await listActiveWorkersForSupervisor(supervisorId);
  if (!team.some((w) => w.id === memberId)) {
    throw new NotFoundError("Trabajador no encontrado");
  }
  const rows = await repo.listScheduledAbsencesForUser(memberId);
  return rows.map(toDTO);
}

export async function deleteOwnScheduledAbsence(userId: string, id: string): Promise<void> {
  const absence = await repo.findScheduledAbsenceById(id);
  if (!absence) throw new NotFoundError("Ausencia no encontrada");
  if (absence.user_id !== userId) throw new ForbiddenError();

  await repo.deleteScheduledAbsenceById(id);
}
