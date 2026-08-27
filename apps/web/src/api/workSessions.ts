import type { ActiveSessionResponse, BreakType, ClockInRequest, SwitchTaskRequest, WorkSessionDTO } from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function fetchActiveSession(): Promise<ActiveSessionResponse> {
  return apiFetch<ActiveSessionResponse>("/work-sessions/active");
}

export function clockIn(input: ClockInRequest = {}): Promise<WorkSessionDTO> {
  return apiFetch<WorkSessionDTO>("/work-sessions/clock-in", { method: "POST", body: input });
}

export function clockOut(): Promise<WorkSessionDTO> {
  return apiFetch<WorkSessionDTO>("/work-sessions/clock-out", { method: "POST" });
}

export function switchTask(input: SwitchTaskRequest): Promise<WorkSessionDTO> {
  return apiFetch<WorkSessionDTO>("/work-sessions/task", { method: "POST", body: input });
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
