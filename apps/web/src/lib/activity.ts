import type { AdminActivityEventDTO } from "@clearwork/shared";
import { ROLE_LABEL, TASK_STATUS_LABEL } from "../constants.js";

/** Compartido entre la tarjeta condensada del home y la vista ampliada
 * de /admin/activity: un único sitio para el texto de cada tipo de evento. */
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

/** "hace 5 min", "hace 2 h"… y a partir de una semana, la fecha. No hace
 * falta más precisión que esa en un feed de actividad. */
export function formatRelativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "ahora mismo";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
