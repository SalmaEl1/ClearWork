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
 * supervisor, derivado de la membresía activa del teletrabajador en un
 * proyecto (ver ProjectMemberDTO). Null si no está en ningún proyecto o
 * si el usuario no es un teletrabajador. */
export type MeResponse = PublicUser & {
  supervisorName: string | null;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
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

export type TaskDTO = {
  id: string;
  projectId: string;
  assigneeId: string | null;
  createdBy: string;
  title: string;
  description: string | null;
  status: TaskStatus;
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

/* --- Panel de administración --- */

export type AdminUserSummary = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  weeklyTargetHours: number;
  /** Solo relevante para teletrabajadores: su proyecto activo, si tiene. */
  currentProjectId: string | null;
  currentProjectName: string | null;
  /** Solo relevante para supervisores: los proyectos que supervisa (puede ser más de uno). */
  supervisedProjects: { id: string; name: string }[];
};

export type AdminCreateUserRequest = {
  email: string;
  password: string;
  fullName: string;
  role: AdminCreatableRole;
  weeklyTargetHours?: number;
};

export type AdminUpdateUserRequest = {
  fullName?: string;
  weeklyTargetHours?: number;
  isActive?: boolean;
};
