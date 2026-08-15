import type { TaskStatus } from "@clearwork/shared";
import { pool } from "../../db/pool.js";
import type { TaskRow, TaskStatusHistoryRow } from "./types.js";

export type CreateTaskInput = {
  projectId: string;
  assigneeId: string | null;
  createdBy: string;
  title: string;
  description: string | null;
  dueDate: string | null;
};

export async function createTask(input: CreateTaskInput): Promise<TaskRow> {
  const result = await pool.query<TaskRow>(
    `INSERT INTO tasks (project_id, assignee_id, created_by, title, description, due_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.projectId,
      input.assigneeId,
      input.createdBy,
      input.title,
      input.description,
      input.dueDate,
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

/** Solo devuelve la tarea si está asignada a ese teletrabajador. */
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

export async function listTasksForWorker(
  workerId: string,
  filters: TaskListFilters,
): Promise<TaskRow[]> {
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

  const result = await pool.query<TaskRow>(
    `SELECT * FROM tasks WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`,
    values,
  );
  return result.rows;
}

export async function listTasksForSupervisor(
  supervisorId: string,
  filters: TaskListFilters,
): Promise<TaskRow[]> {
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

  const result = await pool.query<TaskRow>(
    `SELECT t.*
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY t.created_at DESC`,
    values,
  );
  return result.rows;
}

export type UpdateTaskFields = {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
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
): Promise<TaskStatusHistoryRow> {
  const result = await pool.query<TaskStatusHistoryRow>(
    `INSERT INTO task_status_history (task_id, from_status, to_status, changed_by, work_session_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.taskId, input.fromStatus, input.toStatus, input.changedBy, input.workSessionId],
  );
  const row = result.rows[0];
  if (!row) throw new Error("INSERT de task_status_history no devolvió ninguna fila");
  return row;
}

export async function listStatusHistoryForTask(
  taskId: string,
): Promise<TaskStatusHistoryRow[]> {
  const result = await pool.query<TaskStatusHistoryRow>(
    "SELECT * FROM task_status_history WHERE task_id = $1 ORDER BY changed_at ASC",
    [taskId],
  );
  return result.rows;
}

export type RecentStatusChangeRow = {
  task_title: string;
  project_name: string;
  changed_by_name: string;
  to_status: TaskStatus;
  changed_at: Date;
};

/** Últimos cambios de estado de tarea, de cualquier proyecto, para la
 * actividad reciente del home de admin. */
export async function listRecentStatusChanges(
  limit: number,
): Promise<RecentStatusChangeRow[]> {
  const result = await pool.query<RecentStatusChangeRow>(
    `SELECT t.title AS task_title, p.name AS project_name, u.full_name AS changed_by_name,
            h.to_status, h.changed_at
     FROM task_status_history h
     JOIN tasks t ON t.id = h.task_id
     JOIN projects p ON p.id = t.project_id
     JOIN users u ON u.id = h.changed_by
     ORDER BY h.changed_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
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
