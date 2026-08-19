import type { SupervisorDashboardResponse, WorkerDashboardResponse } from "@clearwork/shared";
import { apiFetch } from "./client.js";

function weekOffsetQuery(weekOffset: number): string {
  return weekOffset !== 0 ? `?weekOffset=${weekOffset}` : "";
}

export function fetchWorkerDashboard(weekOffset = 0): Promise<WorkerDashboardResponse> {
  return apiFetch<WorkerDashboardResponse>(`/dashboard/worker${weekOffsetQuery(weekOffset)}`);
}

export function fetchSupervisorDashboard(weekOffset = 0): Promise<SupervisorDashboardResponse> {
  return apiFetch<SupervisorDashboardResponse>(`/dashboard/supervisor${weekOffsetQuery(weekOffset)}`);
}
