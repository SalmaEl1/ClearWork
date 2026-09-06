import type {
  CreateVacationRequestInput,
  TeamVacationRequestDTO,
  VacationBalanceDTO,
  VacationRequestDTO,
  VacationRulesDTO,
} from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function createVacationRequest(input: CreateVacationRequestInput): Promise<VacationRequestDTO> {
  return apiFetch<VacationRequestDTO>("/vacations", { method: "POST", body: input });
}

export function fetchMyVacationRequests(): Promise<VacationRequestDTO[]> {
  return apiFetch<VacationRequestDTO[]>("/vacations/mine");
}

export function fetchMyVacationBalance(): Promise<VacationBalanceDTO> {
  return apiFetch<VacationBalanceDTO>("/vacations/balance");
}

export function fetchVacationRules(): Promise<VacationRulesDTO> {
  return apiFetch<VacationRulesDTO>("/vacations/rules");
}

export function cancelVacationRequest(id: string): Promise<VacationRequestDTO> {
  return apiFetch<VacationRequestDTO>(`/vacations/${id}/cancel`, { method: "POST" });
}

export function fetchTeamVacationRequests(): Promise<TeamVacationRequestDTO[]> {
  return apiFetch<TeamVacationRequestDTO[]>("/vacations/team");
}

export function approveVacationRequest(id: string): Promise<VacationRequestDTO> {
  return apiFetch<VacationRequestDTO>(`/vacations/${id}/approve`, { method: "POST" });
}

export function rejectVacationRequest(id: string): Promise<VacationRequestDTO> {
  return apiFetch<VacationRequestDTO>(`/vacations/${id}/reject`, { method: "POST" });
}
