import { pool } from "../../db/pool.js";
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

/** Solo devuelve el proyecto si pertenece a ese supervisor. */
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
};

/**
 * Construye el UPDATE solo con los campos presentes en `fields`. Se hace a
 * mano, sin librería, porque el conjunto de columnas editables es pequeño
 * y fijo: cada rama es explícita y fácil de leer, sin generalizar a un
 * "actualiza cualquier columna" genérico.
 */
export async function updateProjectForSupervisor(
  projectId: string,
  supervisorId: string,
  fields: UpdateProjectFields,
): Promise<ProjectRow | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [projectId, supervisorId];

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

  if (setClauses.length === 0) {
    return findProjectForSupervisor(projectId, supervisorId);
  }

  const result = await pool.query<ProjectRow>(
    `UPDATE projects
     SET ${setClauses.join(", ")}, updated_at = now()
     WHERE id = $1 AND supervisor_id = $2
     RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}
