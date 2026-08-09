import type { ProjectDTO } from "@clearwork/shared";
import { NotFoundError } from "../../shared/errors.js";
import * as repo from "./repository.js";
import type { ProjectRow } from "./types.js";
import type { z } from "zod";
import type { createProjectSchema, updateProjectSchema } from "./schemas.js";

type CreateProjectInput = z.infer<typeof createProjectSchema>;
type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

function toProjectDTO(row: ProjectRow): ProjectDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    supervisorId: row.supervisor_id,
    isArchived: row.is_archived,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createProject(
  supervisorId: string,
  input: CreateProjectInput,
): Promise<ProjectDTO> {
  const project = await repo.createProject({
    name: input.name,
    description: input.description ?? null,
    supervisorId,
  });
  return toProjectDTO(project);
}

export async function listProjects(supervisorId: string): Promise<ProjectDTO[]> {
  const projects = await repo.listProjectsForSupervisor(supervisorId);
  return projects.map(toProjectDTO);
}

export async function getProject(
  projectId: string,
  supervisorId: string,
): Promise<ProjectDTO> {
  const project = await repo.findProjectForSupervisor(projectId, supervisorId);
  if (!project) throw new NotFoundError("Proyecto no encontrado");
  return toProjectDTO(project);
}

export async function updateProject(
  projectId: string,
  supervisorId: string,
  input: UpdateProjectInput,
): Promise<ProjectDTO> {
  const updated = await repo.updateProjectForSupervisor(projectId, supervisorId, input);
  if (!updated) throw new NotFoundError("Proyecto no encontrado");
  return toProjectDTO(updated);
}
