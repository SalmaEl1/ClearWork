import type { AdminActivityEventDTO } from "@clearwork/shared";
import type { ComponentType, SVGProps } from "react";
import { IconFolder, IconMemberChange, IconTasks, IconUsers } from "../components/NavIcons.js";

/** El texto de cada tipo de evento vive en @clearwork/shared (issue
 * #134): el backend necesita exactamente el mismo para la columna
 * "Descripción" de la exportación CSV de /admin/activity y
 * /supervisor/activity, así que hay una sola fuente de verdad en vez de
 * mantenerla por duplicado. */
export { activityMessage } from "@clearwork/shared";

/** Icono por categoría de evento, no uno distinto por cada uno de los 14
 * tipos: con tantos, un icono único por tipo sería ruido visual antes
 * que ayuda. Cuatro categorías (cuentas, proyectos, tareas, membresías)
 * ya distinguen de un vistazo de qué trata cada línea. */
export function activityIcon(type: AdminActivityEventDTO["type"]): ComponentType<SVGProps<SVGSVGElement>> {
  switch (type) {
    case "user_created":
    case "user_updated":
    case "user_role_changed":
    case "user_deleted":
      return IconUsers;
    case "project_created":
    case "project_updated":
    case "project_archived":
    case "project_supervisor_changed":
    case "project_deleted":
      return IconFolder;
    case "task_created":
    case "task_status_changed":
    case "task_deleted":
      return IconTasks;
    case "member_joined":
    case "member_left":
      return IconMemberChange;
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
