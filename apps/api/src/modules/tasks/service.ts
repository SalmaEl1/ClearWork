import type {
  Paginated,
  Role,
  TaskDetailDTO,
  TaskDTO,
  TaskHistoryEntryDTO,
  TaskStatus,
  TaskTimeEntryDTO,
  TimeEntryUnit,
} from "@clearwork/shared";
import { WORKDAY_HOURS } from "@clearwork/shared";
import { recordActivity } from "../../shared/activityLog.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../shared/errors.js";
import { notify } from "../../shared/notifications.js";
import { findActiveMembership, findProjectById, findProjectForSupervisor } from "../projects/repository.js";
import { findUserById } from "../users/repository.js";
import { findOpenSessionForUser } from "../work-sessions/repository.js";
import * as repo from "./repository.js";
import type { TaskHistoryWithNameRow, TaskTimeEntryWithNameRow } from "./repository.js";
import type { TaskRow } from "./types.js";
import type { z } from "zod";
import type {
  createTaskSchema,
  logTaskTimeSchema,
  taskListQuerySchema,
  updateTaskSchema,
} from "./schemas.js";

type CreateTaskInput = z.infer<typeof createTaskSchema>;
type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
type TaskListFilters = z.infer<typeof taskListQuerySchema>;
type LogTaskTimeInput = z.infer<typeof logTaskTimeSchema>;

/** Exportado: lo reutiliza projects/service.ts para el listado de tareas
 * de un proyecto que ve el admin, en vez de duplicar el mapeo.
 * loggedMinutes no sale de la propia fila (no hay tal columna: es la
 * suma de task_time_entries, ver repository.ts's sumLoggedMinutesForTasks)
 * así que quien llama tiene que traerlo aparte y pasarlo aquí. */
export function toTaskDTO(row: TaskRow, loggedMinutes: number): TaskDTO {
  const estimatedHours = row.estimated_hours ? Number(row.estimated_hours) : null;
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
    estimatedHours,
    loggedMinutes,
    remainingHours: estimatedHours !== null ? estimatedHours - loggedMinutes / 60 : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Atajo para cuando solo hace falta el total de una tarea, no el mapa
 * completo (sumLoggedMinutesForTasks está pensada para listados). */
async function getLoggedMinutes(taskId: string): Promise<number> {
  const byTask = await repo.sumLoggedMinutesForTasks([taskId]);
  return byTask.get(taskId) ?? 0;
}

function toTimeEntryDTO(row: TaskTimeEntryWithNameRow): TaskTimeEntryDTO {
  return {
    id: row.id,
    taskId: row.task_id,
    loggedBy: row.logged_by,
    loggedByName: row.logged_by_name,
    minutes: row.minutes,
    description: row.description,
    loggedAt: row.logged_at.toISOString(),
  };
}

/** Simplificación documentada junto a WORKDAY_HOURS (roles.ts): todas las
 * unidades se guardan en minutos, redondeando al minuto entero más
 * cercano (a nadie le importa la fracción de segundo de "2.5 horas"). */
function toMinutes(amount: number, unit: TimeEntryUnit): number {
  switch (unit) {
    case "minutes":
      return Math.round(amount);
    case "hours":
      return Math.round(amount * 60);
    case "days":
      return Math.round(amount * WORKDAY_HOURS * 60);
  }
}

/** Cada fila es de estado o de avance (nunca las dos cosas, ver migración
 * 023), así que to_status decide a qué variante del DTO se traduce. */
function toHistoryDTO(row: TaskHistoryWithNameRow): TaskHistoryEntryDTO {
  const base = {
    id: row.id,
    changedBy: row.changed_by,
    changedByName: row.changed_by_name,
    workSessionId: row.work_session_id,
    changedAt: row.changed_at.toISOString(),
  };
  if (row.to_status !== null) {
    return { ...base, kind: "status", fromStatus: row.from_status, toStatus: row.to_status };
  }
  return {
    ...base,
    kind: "progress",
    fromProgressPercentage: row.from_progress_percentage!,
    toProgressPercentage: row.to_progress_percentage!,
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
    estimatedHours: input.estimatedHours ?? null,
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

  // notify() decide por sí solo si esto además manda un correo, según la
  // preferencia de assigneeId para task_assigned (issue #112) — antes
  // era un sendMail aparte, siempre, sin poder desactivarlo.
  if (assigneeId) {
    await notify(assigneeId, {
      type: "task_assigned",
      taskId: task.id,
      taskTitle: task.title,
      projectName: project.name,
    });
  }

  return toTaskDTO(task, 0);
}

export async function listTasks(
  userId: string,
  role: Role,
  filters: TaskListFilters,
): Promise<Paginated<TaskDTO>> {
  const { rows, total } =
    role === "worker"
      ? await repo.listTasksForWorker(userId, filters, filters.page, filters.pageSize)
      : await repo.listTasksForSupervisor(userId, filters, filters.page, filters.pageSize);

  const loggedByTask = await repo.sumLoggedMinutesForTasks(rows.map((r) => r.id));
  return {
    items: rows.map((row) => toTaskDTO(row, loggedByTask.get(row.id) ?? 0)),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getTaskDetail(
  taskId: string,
  userId: string,
  role: Role,
): Promise<TaskDetailDTO> {
  const task = await findScopedTask(taskId, userId, role);
  const [history, creator, timeEntries, loggedMinutes] = await Promise.all([
    repo.listHistoryForTask(task.id),
    findUserById(task.created_by),
    repo.listTimeEntriesForTask(task.id),
    getLoggedMinutes(task.id),
  ]);

  // La creación no sale de una fila de historial (no había nada que
  // registrar todavía): se sintetiza aquí a partir de la propia tarea,
  // siempre como primer punto de la línea de tiempo (issue #108).
  const createdEntry: TaskHistoryEntryDTO = {
    kind: "created",
    changedBy: task.created_by,
    changedByName: creator?.full_name ?? "",
    changedAt: task.created_at.toISOString(),
  };

  return {
    ...toTaskDTO(task, loggedMinutes),
    history: [createdEntry, ...history.map(toHistoryDTO)],
    timeEntries: timeEntries.map(toTimeEntryDTO),
  };
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

  // input.assigneeId !== undefined: el campo venía en la petición (a
  // diferencia de "no tocado"), sea con un id nuevo o explícitamente a
  // null. input.assigneeId (truthy) por sí solo no distinguía "lo quité"
  // de "no lo toqué", y por tanto nunca notificaba una desasignación.
  const assigneeChanged = input.assigneeId !== undefined && input.assigneeId !== existing.assignee_id;
  if (assigneeChanged) {
    const project = await findProjectById(existing.project_id);
    if (project) {
      if (input.assigneeId) {
        await notify(input.assigneeId, {
          type: "task_assigned",
          taskId: updated.id,
          taskTitle: updated.title,
          projectName: project.name,
        });
      }
      if (existing.assignee_id) {
        await notify(existing.assignee_id, {
          type: "task_unassigned",
          taskTitle: updated.title,
          projectName: project.name,
        });
      }
    }
  }

  return toTaskDTO(updated, await getLoggedMinutes(updated.id));
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
      await notify(recipientId, {
        type: "task_status_changed",
        taskId,
        taskTitle: existing.title,
        projectName: project.name,
        status,
        actorName: actor.full_name,
      });
    }
  }

  return toTaskDTO(updated, await getLoggedMinutes(updated.id));
}

/** Mismo alcance que updateTaskStatus (findScopedTask): el trabajador
 * solo su propia tarea asignada, el supervisor solo las de su equipo.
 * Independiente del estado, así que no toca el correo de cambio de
 * estado — pero sí queda en el historial, igual que un cambio de estado
 * (issue #108). Sin cambio real no hay nada que registrar. */
export async function updateTaskProgress(
  taskId: string,
  userId: string,
  role: Role,
  progressPercentage: number,
): Promise<TaskDTO> {
  const existing = await findScopedTask(taskId, userId, role);
  if (progressPercentage === existing.progress_percentage) {
    return toTaskDTO(existing, await getLoggedMinutes(existing.id));
  }

  const updated = await repo.updateTaskProgressById(taskId, progressPercentage);
  if (!updated) throw new NotFoundError("Tarea no encontrada");

  // Solo el trabajador tiene jornadas; para un supervisor esta consulta
  // siempre devuelve null (ver el mismo comentario en updateTaskStatus).
  const openSession = await findOpenSessionForUser(userId);
  await repo.insertProgressHistory({
    taskId,
    fromProgressPercentage: existing.progress_percentage,
    toProgressPercentage: progressPercentage,
    changedBy: userId,
    workSessionId: openSession ? openSession.id : null,
  });

  return toTaskDTO(updated, await getLoggedMinutes(updated.id));
}

/** Igual que updateTaskProgress: mismo alcance, y también best-effort en
 * cuanto a correo (no manda ninguno propio — el registro de tiempo no es
 * un evento por el que avisar a nadie, a diferencia de un cambio de
 * estado o una asignación). */
export async function logTaskTime(
  taskId: string,
  userId: string,
  role: Role,
  input: LogTaskTimeInput,
): Promise<TaskDTO> {
  const task = await findScopedTask(taskId, userId, role);

  await repo.insertTimeEntry({
    taskId: task.id,
    loggedBy: userId,
    minutes: toMinutes(input.amount, input.unit),
    description: input.description,
  });

  return toTaskDTO(task, await getLoggedMinutes(task.id));
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
