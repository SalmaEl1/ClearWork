import type {
  Role,
  TaskDetailDTO,
  TaskDTO,
  TaskStatus,
  TaskStatusHistoryEntryDTO,
} from "@clearwork/shared";
import { env } from "../../config/env.js";
import { sendMail } from "../../email/mailer.js";
import { taskAssignedEmailTemplate, taskStatusChangedEmailTemplate } from "../../email/templates.js";
import { recordActivity } from "../../shared/activityLog.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../shared/errors.js";
import { findActiveMembership, findProjectById, findProjectForSupervisor } from "../projects/repository.js";
import { findUserById } from "../users/repository.js";
import { findOpenSessionForUser } from "../work-sessions/repository.js";
import * as repo from "./repository.js";
import type { TaskStatusHistoryWithNameRow } from "./repository.js";
import type { TaskRow } from "./types.js";
import type { z } from "zod";
import type {
  createTaskSchema,
  taskListQuerySchema,
  updateTaskSchema,
} from "./schemas.js";

type CreateTaskInput = z.infer<typeof createTaskSchema>;
type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
type TaskListFilters = z.infer<typeof taskListQuerySchema>;

/** Exportado: lo reutiliza projects/service.ts para el listado de tareas
 * de un proyecto que ve el admin, en vez de duplicar el mapeo. */
export function toTaskDTO(row: TaskRow): TaskDTO {
  return {
    id: row.id,
    projectId: row.project_id,
    assigneeId: row.assignee_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    status: row.status,
    progressPercentage: row.progress_percentage,
    dueDate: row.due_date,
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function toHistoryDTO(row: TaskStatusHistoryWithNameRow): TaskStatusHistoryEntryDTO {
  return {
    id: row.id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedBy: row.changed_by,
    changedByName: row.changed_by_name,
    workSessionId: row.work_session_id,
    changedAt: row.changed_at.toISOString(),
  };
}

/** La clave ajena de assignee_id no puede exigir "miembro activo de este
 * proyecto"; esa comprobación no la hace la base de datos, se hace aquí. */
async function assertIsProjectMember(workerId: string, projectId: string): Promise<void> {
  const membership = await findActiveMembership(workerId);
  if (!membership || membership.project_id !== projectId) {
    throw new BadRequestError("assigneeId debe ser un trabajador miembro de este proyecto");
  }
}

/** Best-effort: un fallo de envío no debe tumbar la creación/edición de
 * la tarea, igual que en auth/service.ts's forgotPassword. */
async function notifyTaskAssigned(
  assigneeId: string,
  taskId: string,
  taskTitle: string,
  dueDate: string | null,
  projectName: string,
): Promise<void> {
  const assignee = await findUserById(assigneeId);
  if (!assignee) return;

  try {
    await sendMail(
      assignee.email,
      taskAssignedEmailTemplate({
        fullName: assignee.full_name,
        taskTitle,
        projectName,
        dueDate,
        taskUrl: `${env.APP_URL}/worker/tasks/${taskId}`,
      }),
    );
  } catch (err) {
    console.error("No se pudo enviar el correo de tarea asignada", err);
  }
}

/** Best-effort, igual que notifyTaskAssigned: a "la otra parte" del
 * cambio de estado (al supervisor si cambia el trabajador, y viceversa). */
async function notifyTaskStatusChanged(
  recipientId: string,
  actorName: string,
  taskId: string,
  taskTitle: string,
  projectName: string,
  status: TaskStatus,
  taskUrl: string,
): Promise<void> {
  const recipient = await findUserById(recipientId);
  if (!recipient) return;

  try {
    await sendMail(
      recipient.email,
      taskStatusChangedEmailTemplate({
        fullName: recipient.full_name,
        actorName,
        taskTitle,
        projectName,
        status,
        taskUrl: `${env.APP_URL}${taskUrl}`,
      }),
    );
  } catch (err) {
    console.error("No se pudo enviar el correo de cambio de estado de tarea", err);
  }
}

async function findScopedTask(
  taskId: string,
  userId: string,
  role: Role,
): Promise<TaskRow> {
  const task =
    role === "worker"
      ? await repo.findTaskForWorker(taskId, userId)
      : await repo.findTaskForSupervisor(taskId, userId);
  if (!task) throw new NotFoundError("Tarea no encontrada");
  return task;
}

export async function createTask(
  supervisorId: string,
  input: CreateTaskInput,
): Promise<TaskDTO> {
  const project = await findProjectForSupervisor(input.projectId, supervisorId);
  if (!project) {
    throw new BadRequestError("projectId debe corresponder a un proyecto tuyo");
  }
  if (project.is_archived) {
    throw new ConflictError("No se pueden crear tareas en un proyecto archivado");
  }

  const assigneeId = input.assigneeId ?? null;
  if (assigneeId) {
    await assertIsProjectMember(assigneeId, input.projectId);
  }

  const task = await repo.createTask({
    projectId: input.projectId,
    assigneeId,
    createdBy: supervisorId,
    title: input.title,
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
  });

  const supervisor = await findUserById(supervisorId);
  if (supervisor) {
    await recordActivity({
      type: "task_created",
      userName: supervisor.full_name,
      taskTitle: task.title,
      projectName: project.name,
    });
  }

  if (assigneeId) {
    await notifyTaskAssigned(assigneeId, task.id, task.title, task.due_date, project.name);
  }

  return toTaskDTO(task);
}

export async function listTasks(
  userId: string,
  role: Role,
  filters: TaskListFilters,
): Promise<TaskDTO[]> {
  const tasks =
    role === "worker"
      ? await repo.listTasksForWorker(userId, filters)
      : await repo.listTasksForSupervisor(userId, filters);
  return tasks.map(toTaskDTO);
}

export async function getTaskDetail(
  taskId: string,
  userId: string,
  role: Role,
): Promise<TaskDetailDTO> {
  const task = await findScopedTask(taskId, userId, role);
  const history = await repo.listStatusHistoryForTask(task.id);
  return { ...toTaskDTO(task), statusHistory: history.map(toHistoryDTO) };
}

export async function updateTask(
  taskId: string,
  supervisorId: string,
  input: UpdateTaskInput,
): Promise<TaskDTO> {
  // Solo el supervisor edita los campos de una tarea, y solo si es suya.
  const existing = await repo.findTaskForSupervisor(taskId, supervisorId);
  if (!existing) throw new NotFoundError("Tarea no encontrada");

  if (input.assigneeId) {
    await assertIsProjectMember(input.assigneeId, existing.project_id);
  }

  const updated = await repo.updateTaskById(taskId, input);
  if (!updated) throw new NotFoundError("Tarea no encontrada");

  const isReassignment = input.assigneeId && input.assigneeId !== existing.assignee_id;
  if (isReassignment) {
    const project = await findProjectById(existing.project_id);
    if (project) {
      await notifyTaskAssigned(input.assigneeId!, updated.id, updated.title, updated.due_date, project.name);
    }
  }

  return toTaskDTO(updated);
}

export async function updateTaskStatus(
  taskId: string,
  userId: string,
  role: Role,
  status: TaskStatus,
): Promise<TaskDTO> {
  const existing = await findScopedTask(taskId, userId, role);

  const updated = await repo.updateTaskStatusById(taskId, status);
  if (!updated) throw new NotFoundError("Tarea no encontrada");

  // Solo el trabajador tiene jornadas; para un supervisor esta consulta
  // siempre devuelve null, así que no hace falta ramificar por rol aquí.
  const openSession = await findOpenSessionForUser(userId);
  await repo.insertStatusHistory({
    taskId,
    fromStatus: existing.status,
    toStatus: status,
    changedBy: userId,
    workSessionId: openSession ? openSession.id : null,
  });

  // Best-effort para la actividad del admin: si por lo que sea no se
  // resuelve el nombre de quien cambió el estado o el del proyecto (no
  // debería pasar, pero ninguno es imprescindible para el cambio en sí),
  // no se bloquea la operación por eso.
  const [actor, project] = await Promise.all([findUserById(userId), findProjectById(existing.project_id)]);
  if (actor && project) {
    await recordActivity({
      type: "task_status_changed",
      userName: actor.full_name,
      taskTitle: existing.title,
      projectName: project.name,
      toStatus: status,
    });

    // A "la otra parte": si cambia el trabajador se notifica al
    // supervisor del proyecto, y si cambia el supervisor se notifica al
    // trabajador asignado (si tiene uno).
    const recipientId = role === "worker" ? project.supervisor_id : existing.assignee_id;
    if (recipientId && recipientId !== userId) {
      const taskUrl = role === "worker" ? `/supervisor/tasks/${taskId}` : `/worker/tasks/${taskId}`;
      await notifyTaskStatusChanged(recipientId, actor.full_name, taskId, existing.title, project.name, status, taskUrl);
    }
  }

  return toTaskDTO(updated);
}

/** Mismo alcance que updateTaskStatus (findScopedTask): el trabajador
 * solo su propia tarea asignada, el supervisor solo las de su equipo.
 * Independiente del estado, así que no toca el historial ni el correo
 * de cambio de estado. */
export async function updateTaskProgress(
  taskId: string,
  userId: string,
  role: Role,
  progressPercentage: number,
): Promise<TaskDTO> {
  await findScopedTask(taskId, userId, role);

  const updated = await repo.updateTaskProgressById(taskId, progressPercentage);
  if (!updated) throw new NotFoundError("Tarea no encontrada");

  return toTaskDTO(updated);
}

export async function deleteTask(taskId: string, supervisorId: string): Promise<void> {
  const existing = await repo.findTaskForSupervisor(taskId, supervisorId);
  if (!existing) throw new NotFoundError("Tarea no encontrada");
  await repo.deleteTaskById(taskId);

  const [supervisor, project] = await Promise.all([
    findUserById(supervisorId),
    findProjectById(existing.project_id),
  ]);
  if (supervisor && project) {
    await recordActivity({
      type: "task_deleted",
      userName: supervisor.full_name,
      taskTitle: existing.title,
      projectName: project.name,
    });
  }
}
