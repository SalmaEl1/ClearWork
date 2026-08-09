import type { ProjectDetailDTO, ProjectDTO } from "@clearwork/shared";
import { BadRequestError, NotFoundError } from "../../shared/errors.js";
import { findUserById } from "../users/repository.js";
import * as repo from "./repository.js";
import type { ProjectRow } from "./types.js";
import type { z } from "zod";
import type { assignMemberSchema, createProjectSchema, updateProjectSchema } from "./schemas.js";

type CreateProjectInput = z.infer<typeof createProjectSchema>;
type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
type AssignMemberInput = z.infer<typeof assignMemberSchema>;

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

async function toProjectDetailDTO(project: ProjectRow): Promise<ProjectDetailDTO> {
  const [supervisor, members] = await Promise.all([
    findUserById(project.supervisor_id),
    repo.listActiveMembersForProject(project.id),
  ]);

  return {
    ...toProjectDTO(project),
    supervisorName: supervisor?.full_name ?? "",
    members: members.map((m) => ({
      userId: m.user_id,
      fullName: m.full_name,
      joinedAt: m.joined_at.toISOString(),
    })),
  };
}

/** La clave ajena de supervisor_id no puede exigir "usuario con rol
 * supervisor"; esa comprobación no la hace la base de datos, se hace aquí. */
async function assertIsSupervisor(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user || user.role !== "supervisor") {
    throw new BadRequestError("supervisorId debe corresponder a un usuario con rol supervisor");
  }
}

async function assertIsWorker(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user || user.role !== "worker") {
    throw new BadRequestError("userId debe corresponder a un usuario con rol teletrabajador");
  }
}

export async function createProject(input: CreateProjectInput): Promise<ProjectDTO> {
  await assertIsSupervisor(input.supervisorId);

  const project = await repo.createProject({
    name: input.name,
    description: input.description ?? null,
    supervisorId: input.supervisorId,
  });
  return toProjectDTO(project);
}

export async function listProjects(): Promise<ProjectDTO[]> {
  const projects = await repo.listAllProjects();
  return projects.map(toProjectDTO);
}

export async function getProject(projectId: string): Promise<ProjectDetailDTO> {
  const project = await repo.findProjectById(projectId);
  if (!project) throw new NotFoundError("Proyecto no encontrado");
  return toProjectDetailDTO(project);
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectDTO> {
  if (input.supervisorId) {
    await assertIsSupervisor(input.supervisorId);
  }

  const updated = await repo.updateProjectById(projectId, input);
  if (!updated) throw new NotFoundError("Proyecto no encontrado");
  return toProjectDTO(updated);
}

export async function assignMember(
  projectId: string,
  input: AssignMemberInput,
): Promise<ProjectDetailDTO> {
  const project = await repo.findProjectById(projectId);
  if (!project) throw new NotFoundError("Proyecto no encontrado");

  await assertIsWorker(input.userId);
  // Mueve al teletrabajador aquí, cerrando su membresía anterior si la
  // tenía: es la garantía de "como mucho un proyecto a la vez" en acción.
  await repo.reassignMembership(input.userId, projectId);

  return toProjectDetailDTO(project);
}

export async function removeMember(
  projectId: string,
  userId: string,
): Promise<ProjectDetailDTO> {
  const project = await repo.findProjectById(projectId);
  if (!project) throw new NotFoundError("Proyecto no encontrado");

  const membership = await repo.findActiveMembership(userId);
  if (!membership || membership.project_id !== projectId) {
    throw new NotFoundError("Ese teletrabajador no está en este proyecto");
  }

  await repo.closeActiveMembership(userId);
  return toProjectDetailDTO(project);
}

export async function deleteProject(projectId: string): Promise<void> {
  const project = await repo.findProjectById(projectId);
  if (!project) throw new NotFoundError("Proyecto no encontrado");
  await repo.deleteProjectById(projectId);
}
