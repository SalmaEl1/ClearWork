import type { Role, ScheduledAbsenceDTO, TeamScheduledAbsenceDTO } from "@clearwork/shared";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../shared/errors.js";
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

/** El propio trabajador sobre la suya, o su supervisor sobre cualquiera
 * de su equipo — nunca al revés, y nunca alguien ajeno al equipo. Mismo
 * criterio 404 (no 403) que projects/service.ts para no confirmar la
 * composición de un equipo ajeno: solo el caso "es la mía y soy worker"
 * usa 403, porque ahí sí tiene sentido decir "esta no es tuya". */
async function assertCanManage(actorId: string, actorRole: Role, targetUserId: string): Promise<void> {
  if (actorRole === "worker") {
    if (actorId !== targetUserId) throw new ForbiddenError();
    return;
  }
  if (actorRole === "supervisor") {
    const team = await listActiveWorkersForSupervisor(actorId);
    if (!team.some((w) => w.id === targetUserId)) {
      throw new NotFoundError("Trabajador no encontrado");
    }
    return;
  }
  throw new ForbiddenError();
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
  await assertCanManage(supervisorId, "supervisor", memberId);
  const rows = await repo.listScheduledAbsencesForUser(memberId);
  return rows.map(toDTO);
}

/** Las de todo el equipo a la vez, con quién es cada una — para la
 * pestaña de ausencias del supervisor, que gestiona varias personas sin
 * tener que elegirlas de una en una. */
export async function listScheduledAbsencesForTeam(
  supervisorId: string,
): Promise<TeamScheduledAbsenceDTO[]> {
  const team = await listActiveWorkersForSupervisor(supervisorId);
  const nameById = new Map(team.map((w) => [w.id, w.full_name]));
  const rows = await repo.listScheduledAbsencesForUsers(team.map((w) => w.id));
  return rows.map((row) => ({ ...toDTO(row), userFullName: nameById.get(row.user_id) ?? "" }));
}

/** El supervisor programa una ausencia en nombre de alguien de su
 * equipo: a diferencia de createScheduledAbsence (autoservicio del
 * trabajador, solo hoy o más tarde), aquí no hay restricción de fecha —
 * puede ser en el pasado, para dejar constancia de algo que ya pasó, o
 * en el futuro. Sin notificación al trabajador: a diferencia de cuando
 * es él quien la programa (y avisa a su supervisor), aquí quien actúa ya
 * es la otra parte de la relación. */
export async function createScheduledAbsenceForTeamMember(
  supervisorId: string,
  input: { userId: string; date: string; startTime: string; endTime: string; reason: string },
): Promise<ScheduledAbsenceDTO> {
  await assertCanManage(supervisorId, "supervisor", input.userId);
  const row = await repo.insertScheduledAbsence({
    userId: input.userId,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    reason: input.reason,
  });
  return toDTO(row);
}

/** Solo el supervisor edita una ausencia ya creada (ni el propio
 * trabajador ni el admin): puede moverla al pasado o al futuro, y
 * cambiar el motivo. Si solo cambia una de las dos horas, la otra se
 * toma de lo que ya había guardado para poder validar endTime > startTime
 * igualmente — el esquema no puede hacer esa comparación porque no
 * conoce el valor ya guardado. */
export async function updateScheduledAbsence(
  supervisorId: string,
  id: string,
  input: { date?: string; startTime?: string; endTime?: string; reason?: string },
): Promise<ScheduledAbsenceDTO> {
  const existing = await repo.findScheduledAbsenceById(id);
  if (!existing) throw new NotFoundError("Ausencia no encontrada");
  await assertCanManage(supervisorId, "supervisor", existing.user_id);

  const startTime = input.startTime ?? existing.start_time.slice(0, 5);
  const endTime = input.endTime ?? existing.end_time.slice(0, 5);
  if (endTime <= startTime) {
    throw new BadRequestError("endTime debe ser posterior a startTime");
  }

  const updated = await repo.updateScheduledAbsenceById(id, input);
  if (!updated) throw new NotFoundError("Ausencia no encontrada");
  return toDTO(updated);
}

/** El propio trabajador sobre la suya, o su supervisor sobre cualquiera
 * de su equipo — ver assertCanManage. */
export async function deleteScheduledAbsence(actorId: string, actorRole: Role, id: string): Promise<void> {
  const absence = await repo.findScheduledAbsenceById(id);
  if (!absence) throw new NotFoundError("Ausencia no encontrada");
  await assertCanManage(actorId, actorRole, absence.user_id);

  await repo.deleteScheduledAbsenceById(id);
}
