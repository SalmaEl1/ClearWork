import type { Role, TaskStatus } from "@clearwork/shared";

/** Usado en cualquier pantalla que muestre el rol de un usuario: cabecera,
 * perfil, panel de admin. Un único sitio para no repetir el mapeo. */
export const ROLE_LABEL: Record<Role, string> = {
  worker: "Teletrabajador",
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
