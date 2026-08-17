import type { Paginated, ProjectDetailDTO, ProjectDTO, TaskDTO } from "@clearwork/shared";
import { recordActivity } from "../../shared/activityLog.js";
import { toCsv } from "../../shared/csv.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../shared/errors.js";
import { listTasksForProject } from "../tasks/repository.js";
import { toTaskDTO } from "../tasks/service.js";
import { findUserById } from "../users/repository.js";
import * as repo from "./repository.js";
import type { ProjectRow } from "./types.js";
import type { z } from "zod";
import type {
  assignMemberSchema,
  createProjectSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
} from "./schemas.js";

type CreateProjectInput = z.infer<typeof createProjectSchema>;
type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
type AssignMemberInput = z.infer<typeof assignMemberSchema>;
type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

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
    throw new BadRequestError("userId debe corresponder a un usuario con rol trabajador");
  }
}

/** Nombre a mostrar en la actividad del admin; null si no se encuentra (no
 * debería pasar, pero no es motivo para romper la operación real). */
async function resolveUserName(userId: string): Promise<string | null> {
  const user = await findUserById(userId);
  return user?.full_name ?? null;
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

export async function listProjects(query: ListProjectsQuery): Promise<Paginated<ProjectDTO>> {
  const { rows, total } = await repo.listProjectsPage(
    { search: query.search, archived: query.archived },
    query.page,
    query.pageSize,
  );
  return {
    items: rows.map(toProjectDTO),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

const CSV_HEADERS_PROJECTS = ["Nombre", "Descripción", "Supervisor/a", "Archivado", "Creado"];

export async function exportProjectsCsv(filters: {
  search?: string;
  archived?: boolean;
}): Promise<string> {
  const rows = await repo.listProjectsForExport(filters);
  const csvRows = rows.map((p) => [
    p.name,
    p.description ?? "",
    p.supervisor_name,
    p.is_archived ? "Sí" : "No",
    p.created_at.toISOString(),
  ]);
  return toCsv(CSV_HEADERS_PROJECTS, csvRows);
}

export async function getProject(projectId: string): Promise<ProjectDetailDTO> {
  const project = await repo.findProjectById(projectId);
  if (!project) throw new NotFoundError("Proyecto no encontrado");
  return toProjectDetailDTO(project);
}

/** Solo lectura, para el panel de admin: gestionar tareas sigue siendo
 * cosa del supervisor (ver tasks/routes.ts), pero el admin necesita
 * poder verlas para saber en qué estado está un proyecto. */
export async function getProjectTasks(projectId: string): Promise<TaskDTO[]> {
  const project = await repo.findProjectById(projectId);
  if (!project) throw new NotFoundError("Proyecto no encontrado");

  const tasks = await listTasksForProject(projectId);
  return tasks.map(toTaskDTO);
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
  if (project.is_archived) {
    throw new ConflictError("No se puede asignar gente a un proyecto archivado");
  }

  await assertIsWorker(input.userId);

  // Se captura antes de mover al trabajador: es la única forma de
  // saber de qué proyecto viene, para poder registrar el "salió de" además
  // del "se incorporó a". Por una carrera real entre dos reasignaciones a
  // la vez del mismo trabajador esto podría, en un caso extremo,
  // atribuir mal el proyecto de origen en el registro de actividad — un
  // riesgo aceptable para un registro informativo, que no es la garantía
  // real de "un proyecto a la vez" (esa la da el advisory lock de
  // reassignMembership, no esto).
  const previousMembership = await repo.findActiveMembership(input.userId);

  // Mueve al trabajador aquí, cerrando su membresía anterior si la
  // tenía: es la garantía de "como mucho un proyecto a la vez" en acción.
  await repo.reassignMembership(input.userId, projectId);

  const workerName = await resolveUserName(input.userId);
  if (workerName) {
    if (previousMembership && previousMembership.project_id !== projectId) {
      const previousProject = await repo.findProjectById(previousMembership.project_id);
      if (previousProject) {
        await recordActivity({
          type: "member_left",
          userName: workerName,
          projectName: previousProject.name,
        });
      }
    }
    await recordActivity({ type: "member_joined", userName: workerName, projectName: project.name });
  }

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
    throw new NotFoundError("Ese trabajador no está en este proyecto");
  }

  await repo.closeActiveMembership(userId);

  const workerName = await resolveUserName(userId);
  if (workerName) {
    await recordActivity({ type: "member_left", userName: workerName, projectName: project.name });
  }

  return toProjectDetailDTO(project);
}

export async function deleteProject(projectId: string): Promise<void> {
  const project = await repo.findProjectById(projectId);
  if (!project) throw new NotFoundError("Proyecto no encontrado");
  await repo.deleteProjectById(projectId);
}
