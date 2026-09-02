import type { TaskStatus } from "@clearwork/shared";
import { pool } from "../../db/pool.js";
import type { TaskHistoryRow, TaskRow, TaskTimeEntryRow } from "./types.js";

export type CreateTaskInput = {
  projectId: string;
  assigneeId: string | null;
  createdBy: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
};

export async function createTask(input: CreateTaskInput): Promise<TaskRow> {
  const result = await pool.query<TaskRow>(
    `INSERT INTO tasks (project_id, assignee_id, created_by, title, description, due_date, estimated_hours)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.projectId,
      input.assigneeId,
      input.createdBy,
      input.title,
      input.description,
      input.dueDate,
      input.estimatedHours,
    ],
  );
  const row = result.rows[0];
  if (!row) throw new Error("INSERT de task no devolvió ninguna fila");
  return row;
}

export async function findTaskById(taskId: string): Promise<TaskRow | null> {
  const result = await pool.query<TaskRow>("SELECT * FROM tasks WHERE id = $1", [taskId]);
  return result.rows[0] ?? null;
}

/** Solo devuelve la tarea si está asignada a ese trabajador. */
export async function findTaskForWorker(
  taskId: string,
  workerId: string,
): Promise<TaskRow | null> {
  const result = await pool.query<TaskRow>(
    "SELECT * FROM tasks WHERE id = $1 AND assignee_id = $2",
    [taskId, workerId],
  );
  return result.rows[0] ?? null;
}

/** Solo devuelve la tarea si pertenece a un proyecto de ese supervisor. */
export async function findTaskForSupervisor(
  taskId: string,
  supervisorId: string,
): Promise<TaskRow | null> {
  const result = await pool.query<TaskRow>(
    `SELECT t.*
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE t.id = $1 AND p.supervisor_id = $2`,
    [taskId, supervisorId],
  );
  return result.rows[0] ?? null;
}

export type TaskListFilters = {
  status?: TaskStatus;
  projectId?: string;
};

/** Sin comprobación de propiedad: la usa el panel de admin, que puede ver
 * las tareas de cualquier proyecto (a diferencia de listTasksForSupervisor,
 * acotada al supervisor que la llama). */
export async function listTasksForProject(projectId: string): Promise<TaskRow[]> {
  const result = await pool.query<TaskRow>(
    "SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC",
    [projectId],
  );
  return result.rows;
}

export type TaskListPage = {
  rows: TaskRow[];
  total: number;
};

/** Mismo patrón que listProjectsPage (projects/repository.ts):
 * COUNT(*) OVER() trae el total junto con la página en una sola consulta,
 * en vez de necesitar dos (issue #96, paginación en servidor). */
export async function listTasksForWorker(
  workerId: string,
  filters: TaskListFilters,
  page: number,
  pageSize: number,
): Promise<TaskListPage> {
  const conditions = ["assignee_id = $1"];
  const values: unknown[] = [workerId];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters.projectId) {
    values.push(filters.projectId);
    conditions.push(`project_id = $${values.length}`);
  }

  values.push(pageSize, (page - 1) * pageSize);
  const limitParam = values.length - 1;
  const offsetParam = values.length;

  const result = await pool.query<TaskRow & { total_count: string }>(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM tasks
     WHERE ${conditions.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values,
  );
  const total = result.rows.length > 0 ? Number(result.rows[0]!.total_count) : 0;
  return { rows: result.rows, total };
}

export async function listTasksForSupervisor(
  supervisorId: string,
  filters: TaskListFilters,
  page: number,
  pageSize: number,
): Promise<TaskListPage> {
  const conditions = ["p.supervisor_id = $1"];
  const values: unknown[] = [supervisorId];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`t.status = $${values.length}`);
  }
  if (filters.projectId) {
    values.push(filters.projectId);
    conditions.push(`t.project_id = $${values.length}`);
  }

  values.push(pageSize, (page - 1) * pageSize);
  const limitParam = values.length - 1;
  const offsetParam = values.length;

  const result = await pool.query<TaskRow & { total_count: string }>(
    `SELECT t.*, COUNT(*) OVER() AS total_count
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY t.created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values,
  );
  const total = result.rows.length > 0 ? Number(result.rows[0]!.total_count) : 0;
  return { rows: result.rows, total };
}

export type UpdateTaskFields = {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
};

/**
 * Igual que en projects/repository.ts: el UPDATE se construye a mano con
 * el conjunto pequeño y fijo de columnas editables, sin generalizar.
 * La comprobación de propiedad ya se hizo antes de llamar a esta función
 * (ver tasks/service.ts), así que aquí se actualiza directamente por id.
 */
export async function updateTaskById(
  taskId: string,
  fields: UpdateTaskFields,
): Promise<TaskRow | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [taskId];

  if (fields.title !== undefined) {
    values.push(fields.title);
    setClauses.push(`title = $${values.length}`);
  }
  if (fields.description !== undefined) {
    values.push(fields.description);
    setClauses.push(`description = $${values.length}`);
  }
  if (fields.assigneeId !== undefined) {
    values.push(fields.assigneeId);
    setClauses.push(`assignee_id = $${values.length}`);
  }
  if (fields.dueDate !== undefined) {
    values.push(fields.dueDate);
    setClauses.push(`due_date = $${values.length}`);
  }
  if (fields.estimatedHours !== undefined) {
    values.push(fields.estimatedHours);
    setClauses.push(`estimated_hours = $${values.length}`);
  }

  if (setClauses.length === 0) {
    return findTaskById(taskId);
  }

  const result = await pool.query<TaskRow>(
    `UPDATE tasks
     SET ${setClauses.join(", ")}, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

/**
 * Al marcar 'done' se fija completed_at; al salir de 'done' se limpia.
 * Vive en el repositorio (no en el servicio) porque es una consecuencia
 * directa del propio UPDATE, no una regla de negocio independiente.
 */
export async function updateTaskStatusById(
  taskId: string,
  status: TaskStatus,
): Promise<TaskRow | null> {
  const result = await pool.query<TaskRow>(
    `UPDATE tasks
     SET status = $2,
         completed_at = CASE WHEN $2 = 'done' THEN now() ELSE NULL END,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [taskId, status],
  );
  return result.rows[0] ?? null;
}

export async function updateTaskProgressById(
  taskId: string,
  progressPercentage: number,
): Promise<TaskRow | null> {
  const result = await pool.query<TaskRow>(
    `UPDATE tasks
     SET progress_percentage = $2,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [taskId, progressPercentage],
  );
  return result.rows[0] ?? null;
}

export async function deleteTaskById(taskId: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM tasks WHERE id = $1", [taskId]);
  return (result.rowCount ?? 0) > 0;
}

export type InsertStatusHistoryInput = {
  taskId: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  changedBy: string;
  workSessionId: string | null;
};

export async function insertStatusHistory(
  input: InsertStatusHistoryInput,
): Promise<TaskHistoryRow> {
  const result = await pool.query<TaskHistoryRow>(
    `INSERT INTO task_status_history (task_id, from_status, to_status, changed_by, work_session_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.taskId, input.fromStatus, input.toStatus, input.changedBy, input.workSessionId],
  );
  const row = result.rows[0];
  if (!row) throw new Error("INSERT de task_status_history no devolvió ninguna fila");
  return row;
}

export type InsertProgressHistoryInput = {
  taskId: string;
  fromProgressPercentage: number;
  toProgressPercentage: number;
  changedBy: string;
  workSessionId: string | null;
};

/** Mismo tipo de fila e índices que insertStatusHistory (ver migración
 * 023): solo cambia qué columnas se rellenan. */
export async function insertProgressHistory(
  input: InsertProgressHistoryInput,
): Promise<TaskHistoryRow> {
  const result = await pool.query<TaskHistoryRow>(
    `INSERT INTO task_status_history
       (task_id, from_progress_percentage, to_progress_percentage, changed_by, work_session_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.taskId,
      input.fromProgressPercentage,
      input.toProgressPercentage,
      input.changedBy,
      input.workSessionId,
    ],
  );
  const row = result.rows[0];
  if (!row) throw new Error("INSERT de task_status_history (avance) no devolvió ninguna fila");
  return row;
}

export type TaskHistoryWithNameRow = TaskHistoryRow & { changed_by_name: string };

/** JOIN con users para el nombre de quien hizo el cambio: la vista de
 * detalle de tarea lo necesita ("Salma cambió el estado..."), y guardar
 * solo el id obligaría a resolverlo aparte para cada fila. */
export async function listHistoryForTask(taskId: string): Promise<TaskHistoryWithNameRow[]> {
  const result = await pool.query<TaskHistoryWithNameRow>(
    `SELECT h.*, u.full_name AS changed_by_name
     FROM task_status_history h
     JOIN users u ON u.id = h.changed_by
     WHERE h.task_id = $1
     ORDER BY h.changed_at ASC`,
    [taskId],
  );
  return result.rows;
}

export type InsertTimeEntryInput = {
  taskId: string;
  loggedBy: string;
  minutes: number;
  description: string;
};

export async function insertTimeEntry(input: InsertTimeEntryInput): Promise<TaskTimeEntryRow> {
  const result = await pool.query<TaskTimeEntryRow>(
    `INSERT INTO task_time_entries (task_id, logged_by, minutes, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.taskId, input.loggedBy, input.minutes, input.description],
  );
  const row = result.rows[0];
  if (!row) throw new Error("INSERT de task_time_entries no devolvió ninguna fila");
  return row;
}

export type TaskTimeEntryWithNameRow = TaskTimeEntryRow & { logged_by_name: string };

/** Más reciente primero, igual que listHistoryForTask; JOIN con users por
 * el mismo motivo (mostrar quién registró cada entrada). */
export async function listTimeEntriesForTask(taskId: string): Promise<TaskTimeEntryWithNameRow[]> {
  const result = await pool.query<TaskTimeEntryWithNameRow>(
    `SELECT e.*, u.full_name AS logged_by_name
     FROM task_time_entries e
     JOIN users u ON u.id = e.logged_by
     WHERE e.task_id = $1
     ORDER BY e.logged_at DESC`,
    [taskId],
  );
  return result.rows;
}

/**
 * Suma agrupada en SQL en vez de traer todas las filas para sumarlas en
 * JS, y en lote (una consulta para varias tareas a la vez, no una por
 * tarea): toTaskDTO (tasks/service.ts) la necesita tanto para el detalle
 * de una tarea como para listados enteros, y ahí una consulta por fila
 * sería un N+1 según crece la página. Las tareas sin ninguna entrada
 * simplemente no salen en el resultado — de ahí que quien llama lea del
 * mapa con un valor por defecto de 0, no que falte la clave sea un error.
 */
export async function sumLoggedMinutesForTasks(taskIds: string[]): Promise<Map<string, number>> {
  if (taskIds.length === 0) return new Map();
  const result = await pool.query<{ task_id: string; total: string }>(
    `SELECT task_id, SUM(minutes) AS total
     FROM task_time_entries
     WHERE task_id = ANY($1)
     GROUP BY task_id`,
    [taskIds],
  );
  return new Map(result.rows.map((r) => [r.task_id, Number(r.total)]));
}

export type TaskStatusCountRow = {
  project_id: string;
  status: TaskStatus;
  count: string; // COUNT(*) llega como bigint -> string desde pg
};

/** Recuento de tareas por proyecto y estado, para el dashboard del supervisor. */
export async function countTaskStatusesForSupervisor(
  supervisorId: string,
): Promise<TaskStatusCountRow[]> {
  const result = await pool.query<TaskStatusCountRow>(
    `SELECT t.project_id, t.status, COUNT(*) AS count
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE p.supervisor_id = $1
     GROUP BY t.project_id, t.status`,
    [supervisorId],
  );
  return result.rows;
}
