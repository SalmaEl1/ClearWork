import type {
  AssignMemberRequest,
  ProjectDetailDTO,
  ProjectDTO,
  SupervisorWorkerOptionDTO,
  UpdateMyProjectRequest,
} from "@clearwork/shared";
import { apiFetch } from "./client.js";

/** Gestión de los propios proyectos del supervisor: editar nombre/
 * descripción y asignar/quitar miembros. Nunca reasignar quién es el
 * supervisor — eso sigue siendo exclusivo del admin (ver
 * apps/api/src/modules/projects/schemas.ts's updateMyProjectSchema). */
export function fetchMyProject(projectId: string): Promise<ProjectDetailDTO> {
  return apiFetch<ProjectDetailDTO>(`/supervisor/projects/${projectId}`);
}

export function updateMyProject(
  projectId: string,
  input: UpdateMyProjectRequest,
): Promise<ProjectDTO> {
  return apiFetch<ProjectDTO>(`/supervisor/projects/${projectId}`, {
    method: "PATCH",
    body: input,
  });
}

export function assignMemberToMyProject(
  projectId: string,
  input: AssignMemberRequest,
): Promise<ProjectDetailDTO> {
  return apiFetch<ProjectDetailDTO>(`/supervisor/projects/${projectId}/members`, {
    method: "POST",
    body: input,
  });
}

export function removeMemberFromMyProject(
  projectId: string,
  userId: string,
): Promise<ProjectDetailDTO> {
  return apiFetch<ProjectDetailDTO>(`/supervisor/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}

export function fetchWorkersForAssignment(): Promise<SupervisorWorkerOptionDTO[]> {
  return apiFetch<SupervisorWorkerOptionDTO[]>("/supervisor/projects/workers");
}
