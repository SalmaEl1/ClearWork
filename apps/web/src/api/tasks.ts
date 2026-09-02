import type {
  CreateTaskRequest,
  LogTaskTimeRequest,
  Paginated,
  ProjectDTO,
  ProjectMemberDTO,
  TaskDetailDTO,
  TaskDTO,
  TaskStatus,
  UpdateTaskRequest,
} from "@clearwork/shared";
import { apiFetch } from "./client.js";

export type TaskListFilters = {
  status?: TaskStatus;
  projectId?: string;
  page?: number;
  pageSize?: number;
};

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function fetchTasks(filters: TaskListFilters = {}): Promise<Paginated<TaskDTO>> {
  return apiFetch<Paginated<TaskDTO>>(`/tasks${buildQuery(filters)}`);
}

export function fetchTask(id: string): Promise<TaskDetailDTO> {
  return apiFetch<TaskDetailDTO>(`/tasks/${id}`);
}

export function createTask(input: CreateTaskRequest): Promise<TaskDTO> {
  return apiFetch<TaskDTO>("/tasks", { method: "POST", body: input });
}

export function updateTask(id: string, input: UpdateTaskRequest): Promise<TaskDTO> {
  return apiFetch<TaskDTO>(`/tasks/${id}`, { method: "PATCH", body: input });
}

export function updateTaskStatus(id: string, status: TaskStatus): Promise<TaskDTO> {
  return apiFetch<TaskDTO>(`/tasks/${id}/status`, { method: "PATCH", body: { status } });
}

export function updateTaskProgress(id: string, progressPercentage: number): Promise<TaskDTO> {
  return apiFetch<TaskDTO>(`/tasks/${id}/progress`, {
    method: "PATCH",
    body: { progressPercentage },
  });
}

export function logTaskTime(id: string, input: LogTaskTimeRequest): Promise<TaskDTO> {
  return apiFetch<TaskDTO>(`/tasks/${id}/time-entries`, { method: "POST", body: input });
}

export function deleteTask(id: string): Promise<void> {
  return apiFetch<void>(`/tasks/${id}`, { method: "DELETE" });
}

/** Alcance del supervisor: solo sus propios proyectos y los miembros
 * activos de cada uno, lo justo para gestionar tareas. */
export function fetchMyProjects(): Promise<ProjectDTO[]> {
  return apiFetch<ProjectDTO[]>("/supervisor/projects");
}

export function fetchMyProjectMembers(projectId: string): Promise<ProjectMemberDTO[]> {
  return apiFetch<ProjectMemberDTO[]>(`/supervisor/projects/${projectId}/members`);
}
