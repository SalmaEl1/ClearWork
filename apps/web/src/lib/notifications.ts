import type { NotificationDTO } from "@clearwork/shared";
import { TASK_STATUS_LABEL } from "../constants.js";

/** Mismo espíritu que activityMessage (lib/activity.ts), pero en primera
 * persona: son notificaciones sobre lo que le pasó a quien las recibe,
 * no un feed de "quién hizo qué" para el admin. */
export function notificationMessage(notification: NotificationDTO): string {
  switch (notification.type) {
    case "task_assigned":
      return `Se te ha asignado la tarea "${notification.taskTitle}" (${notification.projectName})`;
    case "task_unassigned":
      return `Se te ha quitado la tarea "${notification.taskTitle}" (${notification.projectName})`;
    case "task_status_changed":
      return `${notification.actorName} movió "${notification.taskTitle}" (${notification.projectName}) a ${TASK_STATUS_LABEL[notification.status]}`;
    case "project_member_added":
      return `Te han incorporado al proyecto ${notification.projectName}`;
    case "project_member_removed":
      return `Te han quitado del proyecto ${notification.projectName}`;
    case "project_supervisor_removed":
      return `Ya no supervisas el proyecto ${notification.projectName}`;
  }
}

/** Ruta a la que llevar al hacer clic, si la hay: solo las que todavía
 * apuntan a un recurso al que quien recibe la notificación tiene acceso. */
export function notificationLink(
  notification: NotificationDTO,
  role: "worker" | "supervisor",
): string | null {
  switch (notification.type) {
    case "task_assigned":
    case "task_status_changed":
      return `/${role}/tasks/${notification.taskId}`;
    default:
      return null;
  }
}
