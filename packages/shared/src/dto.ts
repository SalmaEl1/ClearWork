import type { AdminCreatableRole, BreakType, Role, TaskStatus } from "./roles.js";

/** Forma pública de un usuario: nunca incluye password_hash. */
export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  weeklyTargetHours: number;
  isActive: boolean;
  createdAt: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  user: PublicUser;
};

/** Lo que devuelve GET /auth/me: el perfil público más el nombre del
 * supervisor, derivado de la membresía activa del trabajador en un
 * proyecto (ver ProjectMemberDTO). Null si no está en ningún proyecto o
 * si el usuario no es un trabajador. */
export type MeResponse = PublicUser & {
  supervisorName: string | null;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

export type UpdateProfileRequest = {
  fullName?: string;
  email?: string;
};

export type BreakDTO = {
  id: string;
  workSessionId: string;
  type: BreakType;
  startedAt: string;
  endedAt: string | null;
};

export type WorkSessionDTO = {
  id: string;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  /** Minutos trabajados hasta ahora si sigue abierta, o el total si ya se cerró. */
  workedMinutes: number;
  breaks: BreakDTO[];
};

export type ActiveSessionResponse = {
  activeSession: WorkSessionDTO | null;
};

export type StartBreakRequest = {
  type: BreakType;
};

export type ProjectDTO = {
  id: string;
  name: string;
  description: string | null;
  supervisorId: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMemberDTO = {
  userId: string;
  fullName: string;
  joinedAt: string;
};

export type ProjectDetailDTO = ProjectDTO & {
  supervisorName: string;
  members: ProjectMemberDTO[];
};

/** Para el desplegable de "añadir miembro" del supervisor: no necesita
 * ver el resto de datos de un trabajador (email, activo/no...), solo
 * quién es y si ya está en algún proyecto, para poder ofrecer como
 * opción únicamente a quien no tiene ninguno todavía. */
export type SupervisorWorkerOptionDTO = {
  id: string;
  fullName: string;
  currentProjectId: string | null;
};

export type CreateProjectRequest = {
  name: string;
  description?: string | null;
  supervisorId: string;
};

export type UpdateProjectRequest = {
  name?: string;
  description?: string | null;
  isArchived?: boolean;
  supervisorId?: string;
};

export type AssignMemberRequest = {
  userId: string;
};

/** Igual que UpdateProjectRequest, pero sin isArchived ni supervisorId:
 * lo que puede tocar el supervisor de sus propios proyectos. */
export type UpdateMyProjectRequest = {
  name?: string;
  description?: string | null;
};

export type TaskDTO = {
  id: string;
  projectId: string;
  assigneeId: string | null;
  createdBy: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  /** Independiente del estado: el trabajador o el supervisor lo pueden
   * ajustar libremente (0-100), no lo calcula el estado en sí. */
  progressPercentage: number;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskStatusHistoryEntryDTO = {
  id: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  changedBy: string;
  changedByName: string;
  workSessionId: string | null;
  changedAt: string;
};

export type TaskDetailDTO = TaskDTO & {
  statusHistory: TaskStatusHistoryEntryDTO[];
};

export type CreateTaskRequest = {
  projectId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
};

export type UpdateTaskRequest = {
  title?: string;
  description?: string | null;
  assigneeId?: string | null;
  dueDate?: string | null;
};

export type UpdateTaskProgressRequest = {
  progressPercentage: number;
};

export type UpdateTaskStatusRequest = {
  status: TaskStatus;
};

/** 'ok' por debajo del 90% del objetivo, 'near_limit' entre 90-100%, 'over_limit' por encima. */
export type WeeklyHoursStatus = "ok" | "near_limit" | "over_limit";

export type WorkerDashboardResponse = {
  weekStart: string;
  weekEnd: string;
  targetHours: number;
  workedHours: number;
  status: WeeklyHoursStatus;
  isClockedIn: boolean;
  isOnBreak: boolean;
};

export type TeamMemberStatus = "working" | "on_break" | "offline";

export type TeamMemberSummary = {
  id: string;
  fullName: string;
  status: TeamMemberStatus;
  breakType: BreakType | null;
  hoursThisWeek: number;
};

export type ProjectTaskSummary = {
  projectId: string;
  projectName: string;
  pending: number;
  inProgress: number;
  done: number;
};

export type SupervisorDashboardResponse = {
  weekStart: string;
  weekEnd: string;
  team: TeamMemberSummary[];
  projects: ProjectTaskSummary[];
};

/** Envoltorio genérico de una respuesta paginada, usado tanto por el
 * listado de usuarios como por el de proyectos del admin — misma forma,
 * para no repetir `total`/`page`/`pageSize` en cada DTO de lista. */
export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/* --- Panel de administración --- */

export type AdminUserSummary = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  weeklyTargetHours: number;
  /** Solo relevante para trabajadores: su proyecto activo, si tiene. */
  currentProjectId: string | null;
  currentProjectName: string | null;
  /** Solo relevante para supervisores: los proyectos que supervisa (puede ser más de uno). */
  supervisedProjects: { id: string; name: string }[];
};

export type AdminCreateUserRequest = {
  email: string;
  fullName: string;
  role: AdminCreatableRole;
  weeklyTargetHours?: number;
};

/** Respuesta al crear una cuenta: la contraseña provisional se genera en
 * el servidor y se manda por correo. Si el envío falla, se devuelve en
 * claro aquí para que el admin pueda compartirla a mano. */
export type AdminCreateUserResponse = AdminUserSummary & {
  passwordEmailSent: boolean;
  temporaryPassword?: string;
};

export type AdminUpdateUserRequest = {
  fullName?: string;
  email?: string;
  role?: AdminCreatableRole;
  weeklyTargetHours?: number;
  isActive?: boolean;
};

export type AppSettingsDTO = {
  defaultWeeklyTargetHours: number;
  updatedAt: string;
};

export type UpdateAppSettingsRequest = {
  defaultWeeklyTargetHours: number;
};

/** Eventos recientes para el home del admin: altas de cuenta, cambios de
 * estado de tarea, y entradas/salidas de un proyecto. Cada variante trae
 * solo los datos que necesita — el frontend arma el texto a partir de
 * ellos, igual que ya hace con ROLE_LABEL para el rol. */
export type AdminActivityEventDTO =
  | { type: "user_created"; occurredAt: string; userName: string; role: Role }
  | { type: "user_updated"; occurredAt: string; userName: string }
  | { type: "user_role_changed"; occurredAt: string; userName: string; fromRole: Role; toRole: Role }
  | { type: "user_deleted"; occurredAt: string; userName: string; role: Role }
  | { type: "project_created"; occurredAt: string; projectName: string; supervisorName: string }
  | { type: "project_updated"; occurredAt: string; projectName: string }
  | { type: "project_archived"; occurredAt: string; projectName: string; archived: boolean }
  | {
      type: "project_supervisor_changed";
      occurredAt: string;
      projectName: string;
      fromSupervisorName: string;
      toSupervisorName: string;
    }
  | { type: "project_deleted"; occurredAt: string; projectName: string }
  | { type: "task_created"; occurredAt: string; userName: string; taskTitle: string; projectName: string }
  | {
      type: "task_status_changed";
      occurredAt: string;
      userName: string;
      taskTitle: string;
      projectName: string;
      toStatus: TaskStatus;
    }
  | { type: "task_deleted"; occurredAt: string; userName: string; taskTitle: string; projectName: string }
  | { type: "member_joined"; occurredAt: string; userName: string; projectName: string }
  | { type: "member_left"; occurredAt: string; userName: string; projectName: string };

/* --- Notificaciones dentro de la plataforma (trabajador y supervisor) --- */

/** A diferencia de AdminActivityEventDTO (el feed del admin, sobre todo el
 * mundo), estas son personales: cada una pertenece a quien la recibe, y
 * se puede marcar como leída. taskId solo está presente en los tipos
 * donde quien la recibe todavía puede ver esa tarea (asignación y cambio
 * de estado); en los demás la persona ya perdió el acceso al recurso
 * (se la desasignaron, o salió del proyecto), así que no hay a dónde
 * enlazar. */
export type NotificationDTO = { id: string; readAt: string | null; createdAt: string } & (
  | { type: "task_assigned"; taskId: string; taskTitle: string; projectName: string }
  | { type: "task_unassigned"; taskTitle: string; projectName: string }
  | {
      type: "task_status_changed";
      taskId: string;
      taskTitle: string;
      projectName: string;
      status: TaskStatus;
      actorName: string;
    }
  | { type: "project_member_added"; projectName: string }
  | { type: "project_member_removed"; projectName: string }
  | { type: "project_supervisor_removed"; projectName: string }
);
