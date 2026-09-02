import type { NotificationEvent } from "./dto.js";
import type { TaskStatus } from "./roles.js";

/** Copia local a propósito, no importada de otro sitio: apps/web/src/constants.ts
 * y api/src/email/templates.ts ya tienen cada una la suya para lo mismo
 * (la etiqueta en español de cada TaskStatus) — es una duplicación
 * pequeña y estable que el propio proyecto ya tolera, así que esta
 * tercera copia sigue el mismo patrón en vez de forzar una dependencia
 * cruzada nueva solo por esto. */
const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "pendiente",
  in_progress: "en curso",
  done: "hecha",
};

/**
 * Mensaje en primera persona de una notificación: sobre lo que le pasó a
 * quien la recibe, no un feed de "quién hizo qué" (eso es
 * AdminActivityEventDTO, para el admin). Vive en @clearwork/shared, no en
 * apps/web, porque el backend necesita exactamente el mismo texto para
 * decidir el cuerpo del correo cuando la preferencia de una persona
 * incluye email (issue #112, ver api/src/shared/notifications.ts) — una
 * sola fuente de verdad para "qué dice cada tipo de notificación", en vez
 * de mantener el texto por duplicado en cliente y servidor.
 */
export function notificationMessage(notification: NotificationEvent): string {
  switch (notification.type) {
    case "task_assigned":
      return `Se le ha asignado la tarea "${notification.taskTitle}" (${notification.projectName}).`;
    case "task_unassigned":
      return `Se le ha retirado la tarea "${notification.taskTitle}" (${notification.projectName}).`;
    case "task_status_changed":
      return `${notification.actorName} ha actualizado el estado de "${notification.taskTitle}" (${notification.projectName}) a ${TASK_STATUS_LABEL[notification.status]}.`;
    case "project_member_added":
      return `Se le ha incorporado al proyecto ${notification.projectName}.`;
    case "project_member_removed":
      return `Se le ha retirado del proyecto ${notification.projectName}.`;
    case "project_supervisor_removed":
      return `Ya no supervisa el proyecto ${notification.projectName}.`;
    case "project_assigned":
      return `Se le ha asignado el proyecto ${notification.projectName}.`;
    case "vacation_decided":
      return notification.status === "approved"
        ? `Su solicitud de vacaciones (${notification.startDate} a ${notification.endDate}) ha sido aprobada.`
        : `Su solicitud de vacaciones (${notification.startDate} a ${notification.endDate}) ha sido rechazada.`;
    case "vacation_requested":
      return `${notification.workerName} ha solicitado vacaciones (${notification.startDate} a ${notification.endDate}).`;
    case "absence_scheduled":
      return `${notification.workerName} ha programado una ausencia el ${notification.date} de ${notification.startTime} a ${notification.endTime} (${notification.reason}).`;
  }
}

/** Ruta a la que llevar al hacer clic (en la app) o al enlace del correo,
 * si la hay: solo las que todavía apuntan a un recurso al que quien
 * recibe la notificación tiene acceso. */
export function notificationLink(
  notification: NotificationEvent,
  role: "worker" | "supervisor",
): string | null {
  switch (notification.type) {
    case "task_assigned":
    case "task_status_changed":
      return `/${role}/tasks/${notification.taskId}`;
    case "vacation_decided":
      return role === "worker" ? "/worker/vacations" : null;
    case "vacation_requested":
      return role === "supervisor" ? "/supervisor/vacations" : null;
    case "project_assigned":
      return role === "supervisor" ? "/supervisor/projects" : null;
    default:
      return null;
  }
}
