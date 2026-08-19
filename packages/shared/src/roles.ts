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
 * 007_activity_log.sql y 009_activity_log_user_events.sql — un tipo de
 * evento nuevo se añade en los dos sitios a la vez. */
export const ACTIVITY_EVENT_TYPES = [
  "user_created",
  "user_updated",
  "user_role_changed",
  "user_deleted",
  "task_status_changed",
  "member_joined",
  "member_left",
] as const;
export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];
