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
