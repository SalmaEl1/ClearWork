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

/** Simplificación deliberada y documentada (mismo espíritu que las
 * ayudas de "hoy" en shared/time.ts, api): para convertir "1 día" a horas
 * al registrar tiempo dedicado a una tarea (issue #114) hace falta un
 * número fijo de horas por día, y esta app no modela jornadas parciales
 * por persona a ese nivel de detalle. 8 es la jornada completa habitual
 * en España. */
export const WORKDAY_HOURS = 8;

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
 * de notifications (ampliado en la 015 con vacation_decided, estrechado
 * en la 019 al quitar training_assigned, ampliado en la 021 con
 * vacation_requested/absence_scheduled, y de nuevo en la 022 con
 * project_assigned) — un tipo de notificación nuevo se añade en los dos
 * sitios a la vez. A diferencia de ACTIVITY_EVENT_TYPES (para el admin),
 * estas son las que ve trabajador/supervisor sobre su propio trabajo. */
export const NOTIFICATION_TYPES = [
  "task_assigned",
  "task_unassigned",
  "task_status_changed",
  "project_member_added",
  "project_member_removed",
  "project_supervisor_removed",
  "project_assigned",
  "vacation_decided",
  "vacation_requested",
  "absence_scheduled",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Debe coincidir con el CHECK de la columna `channel` en la migración
 * 024 de notification_preferences (issue #112): por dónde puede llegar
 * una notificación — dentro de la plataforma, por correo, ambas cosas, o
 * ninguna (ni se guarda ni se manda). */
export const NOTIFICATION_CHANNELS = ["in_app", "email", "both", "none"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/** Medio por el que se entregaba cada tipo de notificación antes de que
 * existiera esta preferencia (issue #112): así es como se comportaba el
 * código antes de dar a elegir, y sigue siendo lo que recibe quien no ha
 * cambiado nada. Solo task_assigned y task_status_changed mandaban correo
 * además de guardarse en la plataforma (ver email/templates.ts); el
 * resto solo se veían dentro de la app. */
export const DEFAULT_NOTIFICATION_CHANNEL: Record<NotificationType, NotificationChannel> = {
  task_assigned: "both",
  task_unassigned: "in_app",
  task_status_changed: "both",
  project_member_added: "in_app",
  project_member_removed: "in_app",
  project_supervisor_removed: "in_app",
  project_assigned: "in_app",
  vacation_decided: "in_app",
  vacation_requested: "in_app",
  absence_scheduled: "in_app",
};

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
