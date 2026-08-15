import type { AdminActivityEventDTO, AdminCreateUserResponse, AdminUserSummary } from "@clearwork/shared";
import { env } from "../../config/env.js";
import { isForeignKeyViolation } from "../../db/errors.js";
import { sendMail } from "../../email/mailer.js";
import { welcomeEmailTemplate } from "../../email/templates.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../../shared/errors.js";
import {
  closeActiveMembership,
  listActiveMembershipsWithProjectNames,
  listAllProjects,
  listProjectsForSupervisor,
  listRecentMemberJoins,
  listRecentMemberLeaves,
  type WorkerCurrentProjectRow,
} from "../projects/repository.js";
import { listRecentStatusChanges } from "../tasks/repository.js";
import {
  deleteUserById,
  findUserByEmail,
  findUserById,
  listRecentlyCreatedUsers,
  listUsersByRole,
  toPublicUser,
  updateUserById,
} from "../users/repository.js";
import { createAccount, regeneratePassword } from "../users/service.js";
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

/**
 * Manda el correo con una contraseña provisional y arma la respuesta que
 * ven tanto "crear cuenta" como "reenviar bienvenida": si el envío
 * falla, la contraseña se devuelve en claro para que el admin la
 * comparta a mano en vez de dejarlo sin ninguna vía.
 */
async function issuePasswordEmail(
  user: UserRow,
  password: string,
  summary: AdminUserSummary,
): Promise<AdminCreateUserResponse> {
  try {
    await sendMail(
      user.email,
      welcomeEmailTemplate({
        fullName: user.full_name,
        email: user.email,
        password,
        loginUrl: `${env.APP_URL}/login`,
      }),
    );
    return { ...summary, passwordEmailSent: true };
  } catch (err) {
    console.error("No se pudo enviar el correo de bienvenida", err);
    return { ...summary, passwordEmailSent: false, temporaryPassword: password };
  }
}

export async function createUser(input: CreateUserInput): Promise<AdminCreateUserResponse> {
  const { user, generatedPassword } = await createAccount(input);
  const summary = toAdminUserSummary(user, new Map(), new Map());

  // generatedPassword siempre existe aquí: createUserSchema no acepta
  // password, así que este flujo nunca pasa una explícita.
  if (!generatedPassword) {
    return { ...summary, passwordEmailSent: false };
  }

  return issuePasswordEmail(user, generatedPassword, summary);
}

/**
 * Genera una contraseña provisional nueva (la anterior queda invalidada,
 * porque no la guardamos en claro en ningún sitio) y la reenvía. Es la
 * salida para cuando el correo original falló o la persona lo perdió,
 * sin tener que borrar la cuenta y crearla de nuevo.
 */
export async function resendWelcomeEmail(userId: string): Promise<AdminCreateUserResponse> {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError("Usuario no encontrado");

  const password = await regeneratePassword(userId);
  const [projectByUser, supervisedByUser] = await Promise.all([
    currentProjectsByUser(),
    supervisedProjectsByUser(),
  ]);
  const summary = toAdminUserSummary(user, projectByUser, supervisedByUser);

  return issuePasswordEmail(user, password, summary);
}

export async function listUsers(): Promise<AdminUserSummary[]> {
  const [admins, supervisors, workers, projectByUser, supervisedByUser] = await Promise.all([
    listUsersByRole("admin"),
    listUsersByRole("supervisor"),
    listUsersByRole("worker"),
    currentProjectsByUser(),
    supervisedProjectsByUser(),
  ]);

  return [...admins, ...supervisors, ...workers].map((u) =>
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
  actingAdminId: string,
): Promise<AdminUserSummary> {
  const existing = await findUserById(userId);
  if (!existing) throw new NotFoundError("Usuario no encontrado");

  // Un admin no puede desactivar su propia cuenta: como no hay
  // autoregistro para el rol admin, quedarse sin ninguna cuenta admin
  // activa dejaría la aplicación sin nadie que pueda revertirlo.
  if (userId === actingAdminId && input.isActive === false) {
    throw new ForbiddenError("No puedes desactivar tu propia cuenta de administrador");
  }

  if (input.role && input.role !== existing.role) {
    // Mismo motivo que arriba: cambiarse el propio rol es una forma
    // indirecta de quitarse (o quitarle a otros) el control de la cuenta.
    if (userId === actingAdminId) {
      throw new ForbiddenError("No puedes cambiar tu propio rol");
    }

    // Un proyecto exige exactamente un supervisor (supervisor_id NOT
    // NULL): si esta persona todavía supervisa alguno, cambiarle el rol
    // lo dejaría sin supervisor válido. No hay una reasignación
    // automática razonable, así que se bloquea y se pide reasignar antes.
    if (existing.role === "supervisor") {
      const projects = await listProjectsForSupervisor(userId);
      if (projects.length > 0) {
        throw new ConflictError(
          `No puedes cambiar el rol: todavía supervisa ${projects.length} proyecto(s). ` +
            "Reasígnalos a otro supervisor primero.",
        );
      }
    }

    // Al contrario, "ser miembro de un proyecto" solo tiene sentido para
    // un teletrabajador. Si deja de serlo, se le saca del proyecto — es
    // una operación segura y reversible, no hace falta bloquear nada.
    if (existing.role === "worker") {
      await closeActiveMembership(userId);
    }
  }

  if (input.email) {
    const existingEmail = await findUserByEmail(input.email);
    if (existingEmail && existingEmail.id !== userId) {
      throw new ConflictError("Ya existe una cuenta con ese email");
    }
  }

  const updated = await updateUserById(userId, input);
  if (!updated) throw new NotFoundError("Usuario no encontrado");

  const [projectByUser, supervisedByUser] = await Promise.all([
    currentProjectsByUser(),
    supervisedProjectsByUser(),
  ]);
  return toAdminUserSummary(updated, projectByUser, supervisedByUser);
}

export async function deleteUser(userId: string, actingAdminId: string): Promise<void> {
  if (userId === actingAdminId) {
    throw new ForbiddenError("No puedes eliminar tu propia cuenta de administrador");
  }

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

const RECENT_ACTIVITY_LIMIT = 15;

/**
 * Combina cuatro fuentes de eventos (altas de cuenta, cambios de estado de
 * tarea, entradas y salidas de proyecto) para el home del admin. Cada
 * consulta trae como mucho RECENT_ACTIVITY_LIMIT candidatos — de sobra
 * para que, tras fusionarlos y ordenarlos aquí, los más recientes en
 * total nunca falten entre esos candidatos — y se recorta al final a ese
 * mismo límite.
 */
export async function listRecentActivity(): Promise<AdminActivityEventDTO[]> {
  const [recentUsers, statusChanges, joins, leaves] = await Promise.all([
    listRecentlyCreatedUsers(RECENT_ACTIVITY_LIMIT),
    listRecentStatusChanges(RECENT_ACTIVITY_LIMIT),
    listRecentMemberJoins(RECENT_ACTIVITY_LIMIT),
    listRecentMemberLeaves(RECENT_ACTIVITY_LIMIT),
  ]);

  const events: AdminActivityEventDTO[] = [
    ...recentUsers.map((u): AdminActivityEventDTO => ({
      type: "user_created",
      occurredAt: u.created_at.toISOString(),
      userName: u.full_name,
      role: u.role,
    })),
    ...statusChanges.map((h): AdminActivityEventDTO => ({
      type: "task_status_changed",
      occurredAt: h.changed_at.toISOString(),
      userName: h.changed_by_name,
      taskTitle: h.task_title,
      projectName: h.project_name,
      toStatus: h.to_status,
    })),
    ...joins.map((j): AdminActivityEventDTO => ({
      type: "member_joined",
      occurredAt: j.event_at.toISOString(),
      userName: j.user_name,
      projectName: j.project_name,
    })),
    ...leaves.map((l): AdminActivityEventDTO => ({
      type: "member_left",
      occurredAt: l.event_at.toISOString(),
      userName: l.user_name,
      projectName: l.project_name,
    })),
  ];

  events.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  return events.slice(0, RECENT_ACTIVITY_LIMIT);
}
