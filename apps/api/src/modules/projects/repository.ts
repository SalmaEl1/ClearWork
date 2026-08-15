import { pool } from "../../db/pool.js";
import type { UserRow } from "../users/types.js";
import type { ProjectRow } from "./types.js";

export type CreateProjectInput = {
  name: string;
  description: string | null;
  supervisorId: string;
};

export async function createProject(input: CreateProjectInput): Promise<ProjectRow> {
  const result = await pool.query<ProjectRow>(
    `INSERT INTO projects (name, description, supervisor_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.name, input.description, input.supervisorId],
  );
  const row = result.rows[0];
  if (!row) throw new Error("INSERT de project no devolvió ninguna fila");
  return row;
}

export async function findProjectById(projectId: string): Promise<ProjectRow | null> {
  const result = await pool.query<ProjectRow>("SELECT * FROM projects WHERE id = $1", [
    projectId,
  ]);
  return result.rows[0] ?? null;
}

/** Solo devuelve el proyecto si pertenece a ese supervisor. Lo sigue
 * usando tasks/service.ts: crear una tarea en un proyecto exige que ese
 * proyecto sea del supervisor que la crea. */
export async function findProjectForSupervisor(
  projectId: string,
  supervisorId: string,
): Promise<ProjectRow | null> {
  const result = await pool.query<ProjectRow>(
    "SELECT * FROM projects WHERE id = $1 AND supervisor_id = $2",
    [projectId, supervisorId],
  );
  return result.rows[0] ?? null;
}

export async function listAllProjects(): Promise<ProjectRow[]> {
  const result = await pool.query<ProjectRow>(
    "SELECT * FROM projects ORDER BY created_at DESC",
  );
  return result.rows;
}

/** Borra el proyecto y, en cascada, sus tareas, su historial de tareas y
 * las membresías (activas o pasadas) que tuviera — todo declarado
 * ON DELETE CASCADE desde su creación, así que no hay clave ajena que
 * pueda bloquear este borrado. */
export async function deleteProjectById(projectId: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM projects WHERE id = $1", [projectId]);
  return (result.rowCount ?? 0) > 0;
}

export async function listProjectsForSupervisor(
  supervisorId: string,
): Promise<ProjectRow[]> {
  const result = await pool.query<ProjectRow>(
    "SELECT * FROM projects WHERE supervisor_id = $1 ORDER BY created_at DESC",
    [supervisorId],
  );
  return result.rows;
}

export type UpdateProjectFields = {
  name?: string;
  description?: string | null;
  isArchived?: boolean;
  supervisorId?: string;
};

/**
 * Construye el UPDATE solo con los campos presentes en `fields`. Se hace a
 * mano, sin librería, porque el conjunto de columnas editables es pequeño
 * y fijo: cada rama es explícita y fácil de leer, sin generalizar a un
 * "actualiza cualquier columna" genérico. Sin filtro de propiedad: solo el
 * admin edita proyectos, y cualquier proyecto es "suyo".
 */
export async function updateProjectById(
  projectId: string,
  fields: UpdateProjectFields,
): Promise<ProjectRow | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [projectId];

  if (fields.name !== undefined) {
    values.push(fields.name);
    setClauses.push(`name = $${values.length}`);
  }
  if (fields.description !== undefined) {
    values.push(fields.description);
    setClauses.push(`description = $${values.length}`);
  }
  if (fields.isArchived !== undefined) {
    values.push(fields.isArchived);
    setClauses.push(`is_archived = $${values.length}`);
  }
  if (fields.supervisorId !== undefined) {
    values.push(fields.supervisorId);
    setClauses.push(`supervisor_id = $${values.length}`);
  }

  if (setClauses.length === 0) {
    return findProjectById(projectId);
  }

  const result = await pool.query<ProjectRow>(
    `UPDATE projects
     SET ${setClauses.join(", ")}, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

/* --- Membresía de proyecto --- */

export type MembershipRow = {
  id: string;
  project_id: string;
  user_id: string;
  joined_at: Date;
  left_at: Date | null;
};

export async function findActiveMembership(userId: string): Promise<MembershipRow | null> {
  const result = await pool.query<MembershipRow>(
    "SELECT * FROM project_members WHERE user_id = $1 AND left_at IS NULL",
    [userId],
  );
  return result.rows[0] ?? null;
}

export type ActiveMemberRow = {
  user_id: string;
  full_name: string;
  joined_at: Date;
};

export async function listActiveMembersForProject(
  projectId: string,
): Promise<ActiveMemberRow[]> {
  const result = await pool.query<ActiveMemberRow>(
    `SELECT pm.user_id, u.full_name, pm.joined_at
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1 AND pm.left_at IS NULL
     ORDER BY u.full_name ASC`,
    [projectId],
  );
  return result.rows;
}

/** Reemplaza a la antigua listWorkersForSupervisor: el equipo de un
 * supervisor son los teletrabajadores con membresía activa en alguno de
 * sus proyectos, no un campo directo en `users`. */
export async function listActiveWorkersForSupervisor(
  supervisorId: string,
): Promise<UserRow[]> {
  const result = await pool.query<UserRow>(
    `SELECT u.*
     FROM users u
     JOIN project_members pm ON pm.user_id = u.id AND pm.left_at IS NULL
     JOIN projects p ON p.id = pm.project_id
     WHERE p.supervisor_id = $1 AND u.role = 'worker'
     ORDER BY u.full_name ASC`,
    [supervisorId],
  );
  return result.rows;
}

export type WorkerCurrentProjectRow = {
  user_id: string;
  project_id: string;
  project_name: string;
};

/** Proyecto activo de cada teletrabajador que tiene uno, en una sola
 * consulta en lote (para enriquecer el listado de usuarios del admin sin
 * una consulta por persona). */
export async function listActiveMembershipsWithProjectNames(): Promise<
  WorkerCurrentProjectRow[]
> {
  const result = await pool.query<WorkerCurrentProjectRow>(
    `SELECT pm.user_id, pm.project_id, p.name AS project_name
     FROM project_members pm
     JOIN projects p ON p.id = pm.project_id
     WHERE pm.left_at IS NULL`,
  );
  return result.rows;
}

/**
 * Mueve a un teletrabajador a un proyecto nuevo: cierra su membresía
 * activa (si tenía una) y abre una nueva, en una sola transacción. Es la
 * operación que expone el panel de admin como "asignar a proyecto",
 * tanto si el teletrabajador no estaba en ninguno como si venía de otro.
 *
 * Si no tenía ninguna fila que cerrar (caso "sin proyecto todavía"), el
 * UPDATE no bloquea nada, así que dos reasignaciones simultáneas de la
 * misma persona (dos admins a la vez) podrían intentar el INSERT al
 * mismo tiempo y chocar contra el índice único. En vez de dejar que
 * compitan y reintentar a ciegas, se toma un advisory lock de PostgreSQL
 * con clave = userId como primer paso de la transacción: solo serializa
 * entre sí las reasignaciones de esa misma persona (las de cualquier
 * otro teletrabajador siguen en paralelo sin esperar), y se libera solo
 * al confirmar o deshacer.
 */
export async function reassignMembership(
  userId: string,
  newProjectId: string,
): Promise<MembershipRow> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [userId]);
    // clock_timestamp(), no now(): now() se congela al BEGIN de la
    // transacción, y esta puede llevar un rato esperando el advisory
    // lock. Si se usara now(), left_at podría quedar registrado antes
    // que el joined_at de la fila que se está cerrando (que si se
    // insertó con clock_timestamp() en otra transacción que coló
    // primero, ya sería posterior al BEGIN de esta), violando la
    // restricción "left_at > joined_at".
    await client.query(
      "UPDATE project_members SET left_at = clock_timestamp() WHERE user_id = $1 AND left_at IS NULL",
      [userId],
    );
    const result = await client.query<MembershipRow>(
      "INSERT INTO project_members (project_id, user_id) VALUES ($1, $2) RETURNING *",
      [newProjectId, userId],
    );
    await client.query("COMMIT");
    const row = result.rows[0];
    if (!row) throw new Error("INSERT de project_member no devolvió ninguna fila");
    return row;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export type MembershipEventRow = {
  user_name: string;
  project_name: string;
  event_at: Date;
};

/** Últimas incorporaciones a un proyecto, para la actividad reciente del
 * home de admin. */
export async function listRecentMemberJoins(limit: number): Promise<MembershipEventRow[]> {
  const result = await pool.query<MembershipEventRow>(
    `SELECT u.full_name AS user_name, p.name AS project_name, pm.joined_at AS event_at
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     JOIN projects p ON p.id = pm.project_id
     ORDER BY pm.joined_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

/** Últimas salidas de un proyecto (incluye las provocadas por un cambio de
 * rol, ver admin/service.ts closeActiveMembership). */
export async function listRecentMemberLeaves(limit: number): Promise<MembershipEventRow[]> {
  const result = await pool.query<MembershipEventRow>(
    `SELECT u.full_name AS user_name, p.name AS project_name, pm.left_at AS event_at
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     JOIN projects p ON p.id = pm.project_id
     WHERE pm.left_at IS NOT NULL
     ORDER BY pm.left_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

/** Saca a un teletrabajador de su proyecto activo, sin asignarle otro. */
export async function closeActiveMembership(userId: string): Promise<MembershipRow | null> {
  const result = await pool.query<MembershipRow>(
    "UPDATE project_members SET left_at = clock_timestamp() WHERE user_id = $1 AND left_at IS NULL RETURNING *",
    [userId],
  );
  return result.rows[0] ?? null;
}
