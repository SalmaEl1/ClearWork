import type { LeaveDTO, Role } from "@clearwork/shared";
import { ForbiddenError, NotFoundError } from "../../shared/errors.js";
import { listActiveWorkersForSupervisor } from "../projects/repository.js";
import { findUserById } from "../users/repository.js";
import * as repo from "./repository.js";
import type { LeaveRow } from "./repository.js";

function toDTO(row: LeaveRow): LeaveDTO {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    startDate: row.start_date,
    endDate: row.end_date,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  };
}

/** Un admin puede dar de alta una baja a cualquier persona; un
 * supervisor, solo a quien esté en este momento en uno de sus proyectos.
 * Se responde 404 en vez de 403 para no confirmar si alguien pertenece o
 * no a un equipo ajeno (mismo criterio que projects/service.ts). */
async function assertCanManage(actorId: string, actorRole: Role, targetUserId: string): Promise<void> {
  if (actorRole === "worker") throw new ForbiddenError();

  if (actorRole === "admin") {
    const target = await findUserById(targetUserId);
    if (!target) throw new NotFoundError("Usuario no encontrado");
    return;
  }

  const team = await listActiveWorkersForSupervisor(actorId);
  if (!team.some((w) => w.id === targetUserId)) {
    throw new NotFoundError("Usuario no encontrado");
  }
}

export async function createLeave(
  actorId: string,
  actorRole: Role,
  input: { userId: string; type: LeaveDTO["type"]; startDate: string; endDate: string | null },
): Promise<LeaveDTO> {
  await assertCanManage(actorId, actorRole, input.userId);

  const leave = await repo.insertLeave({
    userId: input.userId,
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    createdBy: actorId,
  });
  return toDTO(leave);
}

/** A diferencia de crear o borrar, consultar las propias bajas también lo
 * puede hacer el trabajador afectado (issue #101, para reflejarlas en su
 * historial de jornada) — de solo lectura y solo sobre sí mismo. */
async function assertCanView(actorId: string, actorRole: Role, targetUserId: string): Promise<void> {
  if (actorRole === "worker") {
    if (actorId !== targetUserId) throw new ForbiddenError();
    return;
  }
  await assertCanManage(actorId, actorRole, targetUserId);
}

export async function listLeaves(
  actorId: string,
  actorRole: Role,
  targetUserId: string,
): Promise<LeaveDTO[]> {
  await assertCanView(actorId, actorRole, targetUserId);
  const rows = await repo.listLeavesForUser(targetUserId);
  return rows.map(toDTO);
}

export async function deleteLeave(actorId: string, actorRole: Role, leaveId: string): Promise<void> {
  const leave = await repo.findLeaveById(leaveId);
  if (!leave) throw new NotFoundError("Baja no encontrada");

  await assertCanManage(actorId, actorRole, leave.user_id);
  await repo.deleteLeaveById(leaveId);
}
