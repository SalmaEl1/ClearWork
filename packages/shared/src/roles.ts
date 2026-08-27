export const ROLES = ["worker", "supervisor", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Roles que el panel de admin puede crear directamente. El primer admin
 * se crea con un script de arranque (seedAdmin.ts); a partir de ahí, un
 * admin puede crear otros admins desde el panel, para no depender de un
 * único punto de fallo. */
export const ADMIN_CREATABLE_ROLES = ["worker", "supervisor", "admin"] as const;
export type AdminCreatableRole = (typeof ADMIN_CREATABLE_ROLES)[number];

export const TASK_STATUSES = ["pending", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const BREAK_TYPES = ["lunch", "ergonomic"] as const;
export type BreakType = (typeof BREAK_TYPES)[number];

/** Debe coincidir con el CHECK de la columna `type` en las migraciones
 * 007, 009, 010 y 011 de activity_log — un tipo de evento nuevo se añade
 * en los dos sitios a la vez. */
export const ACTIVITY_EVENT_TYPES = [
  "user_created",
  "user_updated",
  "user_role_changed",
  "user_deleted",
  "project_created",
  "project_updated",
  "project_archived",
  "project_supervisor_changed",
  "project_deleted",
  "task_created",
  "task_status_changed",
  "task_deleted",
  "member_joined",
  "member_left",
] as const;
export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

/** Debe coincidir con el CHECK de la columna `type` en la migración 013
 * de notifications (ampliado en la 015 con vacation_decided) — un tipo
 * de notificación nuevo se añade en los dos sitios a la vez. A diferencia
 * de ACTIVITY_EVENT_TYPES (para el admin), estas son las que ve
 * trabajador/supervisor sobre su propio trabajo. */
export const NOTIFICATION_TYPES = [
  "task_assigned",
  "task_unassigned",
  "task_status_changed",
  "project_member_added",
  "project_member_removed",
  "project_supervisor_removed",
  "vacation_decided",
  "training_assigned",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Debe coincidir con el CHECK de la columna `type` en la migración 014
 * de leaves. "temporary_leave" es el cajón de sastre para una ausencia
 * prolongada que no encaja en las otras dos (no hay una lista cerrada de
 * motivos posibles). */
export const LEAVE_TYPES = ["maternity_paternity", "sick_leave", "temporary_leave"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

/** Debe coincidir con el CHECK de la columna `status` en la migración
 * 015 de vacation_requests. */
export const VACATION_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
export type VacationStatus = (typeof VACATION_STATUSES)[number];
