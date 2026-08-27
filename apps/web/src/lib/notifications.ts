import type { NotificationDTO } from "@clearwork/shared";
import { TASK_STATUS_LABEL } from "../constants.js";

/** Mismo espíritu que activityMessage (lib/activity.ts), pero en primera
 * persona: son notificaciones sobre lo que le pasó a quien las recibe,
 * no un feed de "quién hizo qué" para el admin. */
export function notificationMessage(notification: NotificationDTO): string {
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
    case "vacation_decided":
      return notification.status === "approved"
        ? `Su solicitud de vacaciones (${notification.startDate} a ${notification.endDate}) ha sido aprobada.`
        : `Su solicitud de vacaciones (${notification.startDate} a ${notification.endDate}) ha sido rechazada.`;
    case "training_assigned":
      return `Se le ha asignado la formación "${notification.trainingTitle}".`;
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
    case "vacation_decided":
      return role === "worker" ? "/worker/vacations" : null;
    case "training_assigned":
      return role === "worker" ? "/worker/trainings" : null;
    default:
      return null;
  }
}
