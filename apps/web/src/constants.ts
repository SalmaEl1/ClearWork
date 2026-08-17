import type { ActivityEventType, Role, TaskStatus } from "@clearwork/shared";

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

/** Para el filtro por tipo en /admin/activity. */
export const ACTIVITY_EVENT_TYPE_LABEL: Record<ActivityEventType, string> = {
  user_created: "Altas de cuenta",
  task_status_changed: "Cambios de estado de tarea",
  member_joined: "Entradas a un proyecto",
  member_left: "Salidas de un proyecto",
};
