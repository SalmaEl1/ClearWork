import type {
  ActivityEventType,
  AdminActivityEventDTO,
  AdminCreateUserRequest,
  AdminCreateUserResponse,
  AdminUpdateUserRequest,
  AdminUserSummary,
  AppSettingsDTO,
  AssignMemberRequest,
  CreateProjectRequest,
  Paginated,
  ProjectDetailDTO,
  ProjectDTO,
  Role,
  TaskDTO,
  UpdateAppSettingsRequest,
  UpdateProjectRequest,
} from "@clearwork/shared";
import { apiFetch, downloadFile } from "./client.js";

/** Página lo bastante grande como para que, en la práctica, "pedir una
 * página" equivalga a "traer todo" — usado por las pantallas que
 * necesitan la lista completa (desplegables, cifras del home) en vez de
 * la tabla paginada. Evita mantener un endpoint "sin paginar" aparte. */
const UNPAGINATED_PAGE_SIZE = 1000;

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export type AdminActivityQuery = {
  type?: ActivityEventType;
  page?: number;
  pageSize?: number;
};

export function fetchAdminActivity(
  query: AdminActivityQuery = {},
): Promise<Paginated<AdminActivityEventDTO>> {
  return apiFetch<Paginated<AdminActivityEventDTO>>(`/admin/activity${buildQuery(query)}`);
}

export function fetchAdminSettings(): Promise<AppSettingsDTO> {
  return apiFetch<AppSettingsDTO>("/admin/settings");
}

export function updateAdminSettings(input: UpdateAppSettingsRequest): Promise<AppSettingsDTO> {
  return apiFetch<AppSettingsDTO>("/admin/settings", { method: "PATCH", body: input });
}

export type AdminUsersQuery = {
  search?: string;
  role?: Role;
  page?: number;
  pageSize?: number;
};

export function fetchAdminUsers(query: AdminUsersQuery = {}): Promise<Paginated<AdminUserSummary>> {
  return apiFetch<Paginated<AdminUserSummary>>(`/admin/users${buildQuery(query)}`);
}

export function fetchAllAdminUsers(): Promise<AdminUserSummary[]> {
  return fetchAdminUsers({ pageSize: UNPAGINATED_PAGE_SIZE }).then((page) => page.items);
}

export function exportAdminUsersCsv(filters: { search?: string; role?: Role }): Promise<void> {
  const qs = buildQuery(filters);
  return downloadFile(`/admin/users/export${qs}`, "usuarios.csv");
}

export function createAdminUser(
  input: AdminCreateUserRequest,
): Promise<AdminCreateUserResponse> {
  return apiFetch<AdminCreateUserResponse>("/admin/users", { method: "POST", body: input });
}

export function fetchAdminUser(userId: string): Promise<AdminUserSummary> {
  return apiFetch<AdminUserSummary>(`/admin/users/${userId}`);
}

export function updateAdminUser(
  userId: string,
  input: AdminUpdateUserRequest,
): Promise<AdminUserSummary> {
  return apiFetch<AdminUserSummary>(`/admin/users/${userId}`, { method: "PATCH", body: input });
}

export function deleteAdminUser(userId: string): Promise<void> {
  return apiFetch<void>(`/admin/users/${userId}`, { method: "DELETE" });
}

export type AdminProjectsQuery = {
  search?: string;
  archived?: boolean;
  page?: number;
  pageSize?: number;
};

export function fetchAdminProjects(query: AdminProjectsQuery = {}): Promise<Paginated<ProjectDTO>> {
  return apiFetch<Paginated<ProjectDTO>>(`/admin/projects${buildQuery(query)}`);
}

export function fetchAllAdminProjects(): Promise<ProjectDTO[]> {
  return fetchAdminProjects({ pageSize: UNPAGINATED_PAGE_SIZE }).then((page) => page.items);
}

export function exportAdminProjectsCsv(filters: {
  search?: string;
  archived?: boolean;
}): Promise<void> {
  const qs = buildQuery(filters);
  return downloadFile(`/admin/projects/export${qs}`, "proyectos.csv");
}

export function fetchAdminProject(id: string): Promise<ProjectDetailDTO> {
  return apiFetch<ProjectDetailDTO>(`/admin/projects/${id}`);
}

export function fetchAdminProjectTasks(id: string): Promise<TaskDTO[]> {
  return apiFetch<TaskDTO[]>(`/admin/projects/${id}/tasks`);
}

export function createAdminProject(input: CreateProjectRequest): Promise<ProjectDTO> {
  return apiFetch<ProjectDTO>("/admin/projects", { method: "POST", body: input });
}

export function updateAdminProject(
  id: string,
  input: UpdateProjectRequest,
): Promise<ProjectDTO> {
  return apiFetch<ProjectDTO>(`/admin/projects/${id}`, { method: "PATCH", body: input });
}

export function assignProjectMember(
  projectId: string,
  input: AssignMemberRequest,
): Promise<ProjectDetailDTO> {
  return apiFetch<ProjectDetailDTO>(`/admin/projects/${projectId}/members`, {
    method: "POST",
    body: input,
  });
}

export function removeProjectMember(
  projectId: string,
  userId: string,
): Promise<ProjectDetailDTO> {
  return apiFetch<ProjectDetailDTO>(`/admin/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}

export function deleteAdminProject(projectId: string): Promise<void> {
  return apiFetch<void>(`/admin/projects/${projectId}`, { method: "DELETE" });
}
