import type {
  ActivityEventType,
  BreakType,
  LeaveType,
  NotificationChannel,
  NotificationType,
  Role,
  TaskStatus,
  VacationStatus,
} from "@clearwork/shared";

/** Usado en cualquier pantalla que muestre el rol de un usuario: cabecera,
 * perfil, panel de admin. Un único sitio para no repetir el mapeo. */
export const ROLE_LABEL: Record<Role, string> = {
  worker: "Trabajador",
  supervisor: "Supervisor",
  admin: "Admin",
};

/** En minúscula a propósito: se usa dentro de una frase ("...a en curso"),
 * no como etiqueta suelta. */
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "pendiente",
  in_progress: "en curso",
  done: "hecha",
};

/** Misma paleta status-* que el resto del panel (fichaje, equipo). */
export const TASK_STATUS_PILL_CLASS: Record<TaskStatus, string> = {
  pending: "status-neutral",
  in_progress: "status-warning",
  done: "status-ok",
};

/** Compartido por ClockWidget (fichaje en curso) y el historial de
 * jornadas del trabajador. */
export const BREAK_TYPE_LABEL: Record<BreakType, string> = {
  lunch: "Pausa para comer",
  ergonomic: "Pausa ergonómica",
};

/** Etiqueta de cada tipo de baja/ausencia prolongada, usada tanto en la
 * ficha del admin como en el estado que ve el supervisor de su equipo. */
export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  maternity_paternity: "Maternidad/paternidad",
  sick_leave: "Enfermedad",
  temporary_leave: "Ausencia temporal",
};

export const VACATION_STATUS_LABEL: Record<VacationStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

export const VACATION_STATUS_PILL_CLASS: Record<VacationStatus, string> = {
  pending: "status-warning",
  approved: "status-ok",
  rejected: "status-danger",
  cancelled: "status-neutral",
};

/** Para la pantalla de preferencias de notificación (issue #112, Perfil →
 * Notificaciones). En primera persona, como se leen en la propia lista de
 * notificaciones (ver lib/notifications.ts), no como el feed de
 * actividad del admin. */
export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  task_assigned: "Se le asigna una tarea",
  task_unassigned: "Se le retira una tarea",
  task_status_changed: "Cambia el estado de una tarea suya",
  project_member_added: "Se le incorpora a un proyecto",
  project_member_removed: "Se le retira de un proyecto",
  project_supervisor_removed: "Deja de supervisar un proyecto",
  project_assigned: "Se le asigna un proyecto",
  vacation_decided: "Se decide una solicitud de vacaciones suya",
  vacation_requested: "Alguien de su equipo solicita vacaciones",
  absence_scheduled: "Alguien de su equipo programa una ausencia",
};

export const NOTIFICATION_CHANNEL_LABEL: Record<NotificationChannel, string> = {
  in_app: "Solo en la plataforma",
  email: "Solo por correo",
  both: "Plataforma y correo",
  none: "No recibir",
};

/** Para el filtro por tipo en /admin/activity. */
export const ACTIVITY_EVENT_TYPE_LABEL: Record<ActivityEventType, string> = {
  user_created: "Altas de cuenta",
  user_updated: "Ediciones de cuenta",
  user_role_changed: "Cambios de rol",
  user_deleted: "Bajas de cuenta",
  project_created: "Altas de proyecto",
  project_updated: "Ediciones de proyecto",
  project_archived: "Archivados/desarchivados",
  project_supervisor_changed: "Cambios de supervisor/a",
  project_deleted: "Bajas de proyecto",
  task_created: "Altas de tarea",
  task_status_changed: "Cambios de estado de tarea",
  task_deleted: "Bajas de tarea",
  member_joined: "Entradas a un proyecto",
  member_left: "Salidas de un proyecto",
};
