import type { AdminUserSummary } from "@clearwork/shared";
import { isForeignKeyViolation } from "../../db/errors.js";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import {
  listActiveMembershipsWithProjectNames,
  listAllProjects,
  type WorkerCurrentProjectRow,
} from "../projects/repository.js";
import {
  deleteUserById,
  findUserById,
  listUsersByRole,
  toPublicUser,
  updateUserById,
} from "../users/repository.js";
import { createAccount } from "../users/service.js";
import type { UserRow } from "../users/types.js";
import type { z } from "zod";
import type { createUserSchema, updateUserSchema } from "./schemas.js";

type CreateUserInput = z.infer<typeof createUserSchema>;
type UpdateUserInput = z.infer<typeof updateUserSchema>;

type SupervisedProject = { id: string; name: string };

function toAdminUserSummary(
  user: UserRow,
  projectByUser: Map<string, WorkerCurrentProjectRow>,
  supervisedByUser: Map<string, SupervisedProject[]>,
): AdminUserSummary {
  const membership = projectByUser.get(user.id);
  return {
    ...toPublicUser(user),
    currentProjectId: membership?.project_id ?? null,
    currentProjectName: membership?.project_name ?? null,
    supervisedProjects: supervisedByUser.get(user.id) ?? [],
  };
}

async function currentProjectsByUser(): Promise<Map<string, WorkerCurrentProjectRow>> {
  const memberships = await listActiveMembershipsWithProjectNames();
  return new Map(memberships.map((m) => [m.user_id, m]));
}

/** Agrupa todos los proyectos por su supervisor, en una sola consulta en
 * lote — igual criterio que currentProjectsByUser: evitar una consulta
 * por persona al listar. */
async function supervisedProjectsByUser(): Promise<Map<string, SupervisedProject[]>> {
  const projects = await listAllProjects();
  const map = new Map<string, SupervisedProject[]>();
  for (const project of projects) {
    const list = map.get(project.supervisor_id) ?? [];
    list.push({ id: project.id, name: project.name });
    map.set(project.supervisor_id, list);
  }
  return map;
}

export async function createUser(input: CreateUserInput): Promise<AdminUserSummary> {
  const user = await createAccount(input);
  return toAdminUserSummary(user, new Map(), new Map());
}

export async function listUsers(): Promise<AdminUserSummary[]> {
  const [supervisors, workers, projectByUser, supervisedByUser] = await Promise.all([
    listUsersByRole("supervisor"),
    listUsersByRole("worker"),
    currentProjectsByUser(),
    supervisedProjectsByUser(),
  ]);

  return [...supervisors, ...workers].map((u) =>
    toAdminUserSummary(u, projectByUser, supervisedByUser),
  );
}

export async function getUser(userId: string): Promise<AdminUserSummary> {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("Usuario no encontrado");

  const [projectByUser, supervisedByUser] = await Promise.all([
    currentProjectsByUser(),
    supervisedProjectsByUser(),
  ]);
  return toAdminUserSummary(user, projectByUser, supervisedByUser);
}

export async function updateUser(
  userId: string,
  input: UpdateUserInput,
): Promise<AdminUserSummary> {
  const updated = await updateUserById(userId, input);
  if (!updated) throw new NotFoundError("Usuario no encontrado");

  const [projectByUser, supervisedByUser] = await Promise.all([
    currentProjectsByUser(),
    supervisedProjectsByUser(),
  ]);
  return toAdminUserSummary(updated, projectByUser, supervisedByUser);
}

export async function deleteUser(userId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("Usuario no encontrado");

  try {
    await deleteUserById(userId);
  } catch (err) {
    // ON DELETE RESTRICT en projects.supervisor_id, tasks.created_by y
    // task_status_history.changed_by: no se puede borrar a alguien con
    // proyectos o historial de tareas asociado, para no perder ese rastro
    // en cascada. Se traduce a un mensaje claro en vez del error crudo.
    if (isForeignKeyViolation(err)) {
      throw new ConflictError(
        "No se puede eliminar: esta cuenta tiene proyectos, tareas o historial asociado. " +
          "Reasigna o elimina esos datos primero.",
      );
    }
    throw err;
  }
}
