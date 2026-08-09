import type { SupervisorDashboardResponse, WorkerDashboardResponse } from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function fetchWorkerDashboard(): Promise<WorkerDashboardResponse> {
  return apiFetch<WorkerDashboardResponse>("/dashboard/worker");
}

export function fetchSupervisorDashboard(): Promise<SupervisorDashboardResponse> {
  return apiFetch<SupervisorDashboardResponse>("/dashboard/supervisor");
}
