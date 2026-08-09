import type {
  AdminCreateUserRequest,
  AdminUpdateUserRequest,
  AdminUserSummary,
  AssignMemberRequest,
  CreateProjectRequest,
  ProjectDetailDTO,
  ProjectDTO,
  UpdateProjectRequest,
} from "@clearwork/shared";
import { apiFetch } from "./client.js";

export function fetchAdminUsers(): Promise<AdminUserSummary[]> {
  return apiFetch<AdminUserSummary[]>("/admin/users");
}

export function createAdminUser(input: AdminCreateUserRequest): Promise<AdminUserSummary> {
  return apiFetch<AdminUserSummary>("/admin/users", { method: "POST", body: input });
}

export function updateAdminUser(
  userId: string,
  input: AdminUpdateUserRequest,
): Promise<AdminUserSummary> {
  return apiFetch<AdminUserSummary>(`/admin/users/${userId}`, { method: "PATCH", body: input });
}

export function fetchAdminProjects(): Promise<ProjectDTO[]> {
  return apiFetch<ProjectDTO[]>("/admin/projects");
}

export function fetchAdminProject(id: string): Promise<ProjectDetailDTO> {
  return apiFetch<ProjectDetailDTO>(`/admin/projects/${id}`);
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
