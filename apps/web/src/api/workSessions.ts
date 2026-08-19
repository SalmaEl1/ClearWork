import type { ActiveSessionResponse, BreakType, WorkSessionDTO } from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function fetchActiveSession(): Promise<ActiveSessionResponse> {
  return apiFetch<ActiveSessionResponse>("/work-sessions/active");
}

export function clockIn(): Promise<WorkSessionDTO> {
  return apiFetch<WorkSessionDTO>("/work-sessions/clock-in", { method: "POST" });
}

export function clockOut(): Promise<WorkSessionDTO> {
  return apiFetch<WorkSessionDTO>("/work-sessions/clock-out", { method: "POST" });
}

export function startBreak(type: BreakType): Promise<WorkSessionDTO> {
  return apiFetch<WorkSessionDTO>("/work-sessions/breaks/start", {
    method: "POST",
    body: { type },
  });
}

export function endBreak(): Promise<WorkSessionDTO> {
  return apiFetch<WorkSessionDTO>("/work-sessions/breaks/end", { method: "POST" });
}

export function fetchWorkSessionHistory(limit?: number): Promise<WorkSessionDTO[]> {
  const qs = limit ? `?limit=${limit}` : "";
  return apiFetch<WorkSessionDTO[]>(`/work-sessions${qs}`);
}
