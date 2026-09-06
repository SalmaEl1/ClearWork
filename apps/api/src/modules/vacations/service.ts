import type { TeamVacationRequestDTO, VacationBalanceDTO, VacationRequestDTO } from "@clearwork/shared";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import { notify } from "../../shared/notifications.js";
import { todayDateString } from "../../shared/time.js";
import { listActiveWorkersForSupervisor } from "../projects/repository.js";
import { findSupervisorIdForWorker } from "../projects/service.js";
import { findUserById } from "../users/repository.js";
import { daySpan, vacationDaysForYear } from "./balance.js";
import * as repo from "./repository.js";
import type { VacationRequestRow } from "./repository.js";

/** Días ya consumidos ese año: solicitudes propias que no estén
 * rechazadas ni canceladas (una pendiente ya "reserva" saldo, igual que
 * una aprobada) y cuyo inicio caiga en `year`. */
function usedDaysInYear(requests: VacationRequestRow[], year: number): number {
  return requests
    .filter((r) => r.status !== "rejected" && r.status !== "cancelled")
    .filter((r) => r.start_date.slice(0, 4) === String(year))
    .reduce((sum, r) => sum + daySpan(r.start_date, r.end_date), 0);
}

/** Usado también desde dashboard/service.ts para mostrar el saldo de
 * cada persona del equipo en la vista "Equipo" del supervisor. */
export function computeVacationBalance(
  hireDate: string,
  requests: VacationRequestRow[],
  year: number,
): VacationBalanceDTO {
  const total = vacationDaysForYear(hireDate, year);
  const used = usedDaysInYear(requests, year);
  return { year, total, used, remaining: Math.max(total - used, 0) };
}

async function assertWithinVacationBalance(
  workerId: string,
  startDate: string,
  endDate: string,
): Promise<void> {
  const worker = await findUserById(workerId);
  if (!worker) throw new NotFoundError("Usuario no encontrado");

  const year = Number(startDate.slice(0, 4));
  const requestedDays = daySpan(startDate, endDate);
  const existing = await repo.listVacationRequestsForUser(workerId);
  const used = usedDaysInYear(existing, year);
  const total = vacationDaysForYear(worker.hire_date, year);

  if (used + requestedDays > total) {
    throw new ConflictError(
      `No quedan suficientes días de vacaciones: quedan ${Math.max(total - used, 0)} de ${total} para ${year}`,
    );
  }
}

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
  await assertWithinVacationBalance(workerId, input.startDate, input.endDate);

  const request = await repo.insertVacationRequest(workerId, input.startDate, input.endDate);

  const supervisorId = await findSupervisorIdForWorker(workerId);
  const worker = supervisorId ? await findUserById(workerId) : null;
  if (supervisorId && worker) {
    await notify(supervisorId, {
      type: "vacation_requested",
      workerName: worker.full_name,
      startDate: input.startDate,
      endDate: input.endDate,
    });
  }

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

  if (request.status === "cancelled") {
    throw new ConflictError("Esta solicitud fue cancelada por quien la pidió");
  }
  // Antes de que llegue la fecha de inicio, el supervisor puede aprobar,
  // rechazar, o cambiar de opinión sobre una decisión ya tomada. Una vez
  // empiezan las vacaciones, la decisión queda fija.
  if (request.status !== "pending" && request.start_date <= todayDateString()) {
    throw new ConflictError("Ya no se puede cambiar la decisión: la fecha de inicio ya ha llegado");
  }

  const updated = await repo.updateVacationStatus(requestId, status, supervisorId);
  if (request.status !== status) {
    await notify(request.user_id, {
      type: "vacation_decided",
      status,
      startDate: request.start_date,
      endDate: request.end_date,
    });
  }

  return toDTO(updated!);
}

export function approveVacationRequest(supervisorId: string, requestId: string) {
  return decideVacationRequest(supervisorId, requestId, "approved");
}

export function rejectVacationRequest(supervisorId: string, requestId: string) {
  return decideVacationRequest(supervisorId, requestId, "rejected");
}
