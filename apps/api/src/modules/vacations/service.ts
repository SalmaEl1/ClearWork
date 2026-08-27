import type { TeamVacationRequestDTO, VacationRequestDTO } from "@clearwork/shared";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import { notify } from "../../shared/notifications.js";
import { listActiveWorkersForSupervisor } from "../projects/repository.js";
import * as repo from "./repository.js";
import type { VacationRequestRow } from "./repository.js";

function toDTO(row: VacationRequestRow): VacationRequestDTO {
  return {
    id: row.id,
    userId: row.user_id,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at ? row.decided_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

export async function createVacationRequest(
  workerId: string,
  input: { startDate: string; endDate: string },
): Promise<VacationRequestDTO> {
  const request = await repo.insertVacationRequest(workerId, input.startDate, input.endDate);
  return toDTO(request);
}

export async function listMyVacationRequests(workerId: string): Promise<VacationRequestDTO[]> {
  const rows = await repo.listVacationRequestsForUser(workerId);
  return rows.map(toDTO);
}

export async function cancelOwnVacationRequest(
  workerId: string,
  requestId: string,
): Promise<VacationRequestDTO> {
  const request = await repo.findVacationRequestById(requestId);
  if (!request || request.user_id !== workerId) {
    throw new NotFoundError("Solicitud no encontrada");
  }
  if (request.status !== "pending") {
    throw new ConflictError("Solo se puede cancelar una solicitud pendiente");
  }

  const updated = await repo.updateVacationStatus(requestId, "cancelled", null);
  return toDTO(updated!);
}

export async function listTeamVacationRequests(supervisorId: string): Promise<TeamVacationRequestDTO[]> {
  const team = await listActiveWorkersForSupervisor(supervisorId);
  const nameById = new Map(team.map((w) => [w.id, w.full_name]));
  const rows = await repo.listVacationRequestsForUsers(team.map((w) => w.id));
  return rows.map((row) => ({ ...toDTO(row), userFullName: nameById.get(row.user_id) ?? "" }));
}

async function assertRequestBelongsToTeam(
  supervisorId: string,
  request: VacationRequestRow,
): Promise<void> {
  const team = await listActiveWorkersForSupervisor(supervisorId);
  if (!team.some((w) => w.id === request.user_id)) {
    throw new NotFoundError("Solicitud no encontrada");
  }
}

async function decideVacationRequest(
  supervisorId: string,
  requestId: string,
  status: "approved" | "rejected",
): Promise<VacationRequestDTO> {
  const request = await repo.findVacationRequestById(requestId);
  if (!request) throw new NotFoundError("Solicitud no encontrada");

  await assertRequestBelongsToTeam(supervisorId, request);

  if (request.status !== "pending") {
    throw new ConflictError("Esta solicitud ya se ha decidido");
  }

  const updated = await repo.updateVacationStatus(requestId, status, supervisorId);
  await notify(request.user_id, {
    type: "vacation_decided",
    status,
    startDate: request.start_date,
    endDate: request.end_date,
  });

  return toDTO(updated!);
}

export function approveVacationRequest(supervisorId: string, requestId: string) {
  return decideVacationRequest(supervisorId, requestId, "approved");
}

export function rejectVacationRequest(supervisorId: string, requestId: string) {
  return decideVacationRequest(supervisorId, requestId, "rejected");
}
