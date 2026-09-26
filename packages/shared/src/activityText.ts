import type { AdminActivityEventDTO } from "./dto.js";
import type { Role, TaskStatus } from "./roles.js";

/** Copia local a propósito, no importada de otro sitio: apps/web/src/constants.ts
 * ya tiene la suya para lo mismo — es una duplicación pequeña y estable
 * que el propio proyecto ya tolera (mismo criterio que notificationText.ts). */
const ROLE_LABEL: Record<Role, string> = {
  worker: "Trabajador",
  supervisor: "Supervisor",
  admin: "Admin",
};

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "pendiente",
  in_progress: "en curso",
  done: "hecha",
};

/**
 * Mensaje en español de un evento de actividad — una sola fuente de
 * verdad para el feed de /admin/activity y /supervisor/activity
 * (apps/web/src/lib/activity.ts la reexporta para la UI) y para la
 * columna "Descripción" de su exportación CSV
 * (apps/api/src/modules/admin/service.ts), que necesita el mismo texto
 * sin depender de React.
 */
export function activityMessage(event: AdminActivityEventDTO): string {
  switch (event.type) {
    case "user_created":
      return `${event.userName} se dio de alta como ${ROLE_LABEL[event.role].toLowerCase()}`;
    case "user_updated":
      return `Se editó la cuenta de ${event.userName}`;
    case "user_role_changed":
      return `${event.userName} pasó de ${ROLE_LABEL[event.fromRole].toLowerCase()} a ${ROLE_LABEL[event.toRole].toLowerCase()}`;
    case "user_deleted":
      return `Se eliminó la cuenta de ${event.userName} (${ROLE_LABEL[event.role].toLowerCase()})`;
    case "project_created":
      return `Se creó el proyecto ${event.projectName}, a cargo de ${event.supervisorName}`;
    case "project_updated":
      return `Se editó el proyecto ${event.projectName}`;
    case "project_archived":
      return `${event.projectName} se ${event.archived ? "archivó" : "desarchivó"}`;
    case "project_supervisor_changed":
      return `${event.projectName} pasó de ${event.fromSupervisorName} a ${event.toSupervisorName}`;
    case "project_deleted":
      return `Se eliminó el proyecto ${event.projectName}`;
    case "task_created":
      return `${event.userName} creó la tarea "${event.taskTitle}" en ${event.projectName}`;
    case "task_status_changed":
      return `${event.userName} movió "${event.taskTitle}" (${event.projectName}) a ${TASK_STATUS_LABEL[event.toStatus]}`;
    case "task_deleted":
      return `${event.userName} eliminó la tarea "${event.taskTitle}" de ${event.projectName}`;
    case "member_joined":
      return `${event.userName} se incorporó a ${event.projectName}`;
    case "member_left":
      return `${event.userName} salió de ${event.projectName}`;
  }
}
