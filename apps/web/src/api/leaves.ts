import type { CreateLeaveRequest, LeaveDTO } from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function createLeave(input: CreateLeaveRequest): Promise<LeaveDTO> {
  return apiFetch<LeaveDTO>("/leaves", { method: "POST", body: input });
}

export function fetchLeaves(userId: string): Promise<LeaveDTO[]> {
  return apiFetch<LeaveDTO[]>(`/leaves?userId=${userId}`);
}

export function deleteLeave(id: string): Promise<void> {
  return apiFetch<void>(`/leaves/${id}`, { method: "DELETE" });
}
