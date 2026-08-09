import type {
  Role,
  TaskDetailDTO,
  TaskDTO,
  TaskStatus,
  TaskStatusHistoryEntryDTO,
} from "@clearwork/shared";
import { BadRequestError, NotFoundError } from "../../shared/errors.js";
import { findProjectForSupervisor } from "../projects/repository.js";
import { findUserById } from "../users/repository.js";
import { findOpenSessionForUser } from "../work-sessions/repository.js";
import * as repo from "./repository.js";
import type { TaskRow, TaskStatusHistoryRow } from "./types.js";
import type { z } from "zod";
import type {
  createTaskSchema,
  taskListQuerySchema,
  updateTaskSchema,
} from "./schemas.js";

type CreateTaskInput = z.infer<typeof createTaskSchema>;
type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
type TaskListFilters = z.infer<typeof taskListQuerySchema>;

function toTaskDTO(row: TaskRow): TaskDTO {
  return {
    id: row.id,
    projectId: row.project_id,
    assigneeId: row.assignee_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    status: row.status,
    dueDate: row.due_date,
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function toHistoryDTO(row: TaskStatusHistoryRow): TaskStatusHistoryEntryDTO {
  return {
    id: row.id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedBy: row.changed_by,
    workSessionId: row.work_session_id,
    changedAt: row.changed_at.toISOString(),
  };
}

/** La clave ajena de assignee_id no puede exigir "worker a cargo de este
 * supervisor"; esa comprobación no la hace la base de datos, se hace aquí,
 * igual que con supervisorId en auth/service.ts. */
async function assertIsOwnWorker(workerId: string, supervisorId: string): Promise<void> {
  const worker = await findUserById(workerId);
  if (!worker || worker.role !== "worker" || worker.supervisor_id !== supervisorId) {
    throw new BadRequestError("assigneeId debe ser un teletrabajador a tu cargo");
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

  const assigneeId = input.assigneeId ?? null;
  if (assigneeId) {
    await assertIsOwnWorker(assigneeId, supervisorId);
  }

  const task = await repo.createTask({
    projectId: input.projectId,
    assigneeId,
    createdBy: supervisorId,
    title: input.title,
    description: input.description ?? null,
    dueDate: input.dueDate ?? null,
  });
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
    await assertIsOwnWorker(input.assigneeId, supervisorId);
  }

  const updated = await repo.updateTaskById(taskId, input);
  if (!updated) throw new NotFoundError("Tarea no encontrada");
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

  // Solo el teletrabajador tiene jornadas; para un supervisor esta consulta
  // siempre devuelve null, así que no hace falta ramificar por rol aquí.
  const openSession = await findOpenSessionForUser(userId);
  await repo.insertStatusHistory({
    taskId,
    fromStatus: existing.status,
    toStatus: status,
    changedBy: userId,
    workSessionId: openSession ? openSession.id : null,
  });

  return toTaskDTO(updated);
}

export async function deleteTask(taskId: string, supervisorId: string): Promise<void> {
  const existing = await repo.findTaskForSupervisor(taskId, supervisorId);
  if (!existing) throw new NotFoundError("Tarea no encontrada");
  await repo.deleteTaskById(taskId);
}
